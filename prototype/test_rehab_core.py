"""核心算法验证。运行: python3 -m pytest prototype/test_rehab_core.py -q

也可直接 python3 prototype/test_rehab_core.py 查看可读报告。
"""

from __future__ import annotations

import math
import random

from rehab_core import (
    Envelope,
    Phase,
    RepCounter,
    SessionSignals,
    Verdict,
    clamp_llm_output,
    count_naive,
    decide,
    knee_extension,
    safety_gate,
    shoulder_abduction,
    shrug_deg,
    trunk_lean_deg,
)

# ---------------------------------------------------------------- 构造测试骨架


def make_landmarks(
    abduction_deg: float = 0.0,
    shrug: float = 0.0,
    lean: float = 0.0,
    knee_deg: float = 180.0,
) -> list[tuple[float, float]]:
    """按给定的真值角度合成一组关键点, 用于检验解算是否准确。

    图像坐标系: x 向右, y 向下。
    """
    lm = [(0.0, 0.0)] * 33
    # 髋部为原点基准
    lm[23] = (-0.10, 0.50)  # 左髋
    lm[24] = (0.10, 0.50)  # 右髋

    # 躯干带侧倾: 肩中点相对髋中点偏移
    lean_r = math.radians(lean)
    sx = 0.0 + math.sin(lean_r) * 0.40
    sy = 0.50 - math.cos(lean_r) * 0.40

    # 双肩带耸肩倾角
    shrug_r = math.radians(shrug)
    half = 0.20
    lm[11] = (sx - half * math.cos(shrug_r), sy - half * math.sin(shrug_r))  # 左肩
    lm[12] = (sx + half * math.cos(shrug_r), sy + half * math.sin(shrug_r))  # 右肩

    # 左上臂: 从躯干方向(肩->髋)绕肩点旋转 abduction 度
    trunk = (lm[23][0] - lm[11][0], lm[23][1] - lm[11][1])
    tn = math.hypot(*trunk)
    ux, uy = trunk[0] / tn, trunk[1] / tn
    a = math.radians(abduction_deg)
    rx = ux * math.cos(a) - uy * math.sin(a)
    ry = ux * math.sin(a) + uy * math.cos(a)
    lm[13] = (lm[11][0] + rx * 0.28, lm[11][1] + ry * 0.28)  # 左肘
    lm[15] = (lm[11][0] + rx * 0.55, lm[11][1] + ry * 0.55)  # 左腕

    # 左下肢: 髋-膝-踝, 按 knee_deg 弯曲
    lm[25] = (lm[23][0], lm[23][1] + 0.35)  # 左膝
    k = math.radians(180.0 - knee_deg)
    lm[27] = (lm[25][0] + math.sin(k) * 0.35, lm[25][1] + math.cos(k) * 0.35)  # 左踝
    return lm


# ---------------------------------------------------------------- 1. 角度解算


def test_shoulder_abduction_matches_ground_truth():
    for truth in (0, 15, 30, 45, 60, 75, 90, 120):
        got = shoulder_abduction(make_landmarks(abduction_deg=truth), "L")
        assert abs(got - truth) < 0.5, f"外展角 真值{truth} 解算{got:.2f}"


def test_knee_extension_matches_ground_truth():
    for truth in (90, 120, 150, 180):
        got = knee_extension(make_landmarks(knee_deg=truth), "L")
        assert abs(got - truth) < 0.5, f"膝角 真值{truth} 解算{got:.2f}"


# ---------------------------------------------------------------- 2. 代偿检测


def test_shrug_and_trunk_lean_detected():
    assert shrug_deg(make_landmarks(shrug=0)) < 0.5
    assert abs(shrug_deg(make_landmarks(shrug=18)) - 18) < 0.5
    assert trunk_lean_deg(make_landmarks(lean=0)) < 0.5
    assert abs(trunk_lean_deg(make_landmarks(lean=14)) - 14) < 0.5


def test_compensation_threshold_gating():
    tol = 12.0
    assert shrug_deg(make_landmarks(shrug=8)) < tol  # 容差内, 不告警
    assert shrug_deg(make_landmarks(shrug=20)) > tol  # 超容差, 应告警


# ---------------------------------------------------------------- 3. 计数状态机


def build_reps(n: int, peak: float, noise: float = 0.0, seed: int = 0) -> list[float]:
    """合成 n 次往复动作的角度序列, noise 为关键点抖动幅度(度)。"""
    rnd = random.Random(seed)
    seq: list[float] = []
    for _ in range(n):
        up = list(range(0, int(peak), 5))
        down = list(range(int(peak), -1, -5))
        for a in up + [peak] * 5 + down:
            seq.append(a + (rnd.uniform(-noise, noise) if noise else 0.0))
    return seq


def test_rep_counter_clean_signal():
    c = RepCounter(up_thresh=45, down_thresh=20)
    for a in build_reps(8, 70):
        c.update(a)
    assert c.reps == 8
    assert c.phase is Phase.REST


def test_hysteresis_beats_naive_under_jitter():
    """关键点抖动下, 单阈值会误计数, 迟滞不会。这是最容易踩的工程坑。"""
    seq = build_reps(6, 70, noise=9.0, seed=7)
    naive = count_naive(seq, thresh=45)
    c = RepCounter(up_thresh=45, down_thresh=20)
    for a in seq:
        c.update(a)
    assert c.reps == 6, f"迟滞计数 {c.reps} 应为 6"
    assert naive > c.reps, f"单阈值 {naive} 应因抖动而多计"


def test_partial_range_not_counted():
    """幅度不达阈值的半程动作不应计数。"""
    c = RepCounter(up_thresh=45, down_thresh=20)
    for a in build_reps(5, 35):  # 峰值 35 < 45
        c.update(a)
    assert c.reps == 0


def test_peaks_recorded_for_quality_scoring():
    c = RepCounter(up_thresh=45, down_thresh=20)
    for a in build_reps(4, 80):
        c.update(a)
    assert len(c.peaks) == 4
    assert all(abs(p - 80) < 1 for p in c.peaks)


def test_hysteresis_config_validated():
    try:
        RepCounter(up_thresh=30, down_thresh=40)
    except ValueError:
        return
    raise AssertionError("down_thresh >= up_thresh 时应拒绝构造")


# ---------------------------------------------------------------- 4. 安全闸门

ENV = Envelope(
    reps_min=10,
    reps_target=15,
    reps_max=20,
    rom_floor=45,
    rom_target=70,
    rom_ceiling=90,
    shrug_tolerance_deg=12,
    trunk_lean_tolerance_deg=10,
    stop_pain_nrs=4,
    escalate_pain_nrs=6,
    escalate_quality_drop_pct=30,
    escalate_no_activity_days=3,
)


def sig(**kw) -> SessionSignals:
    base = dict(
        pain_nrs=1,
        mean_peak_rom=68.0,
        baseline_rom=70.0,
        compensation_rate=0.1,
        completed_reps=15,
        days_since_last_session=1,
    )
    base.update(kw)
    return SessionSignals(**base)


def test_gate_proceeds_when_within_envelope():
    g = safety_gate(ENV, sig())
    assert g.verdict is Verdict.PROCEED and g.llm_may_decide


def test_gate_stops_on_pain():
    g = safety_gate(ENV, sig(pain_nrs=4))
    assert g.verdict is Verdict.STOP_SESSION and not g.llm_may_decide


def test_gate_escalates_on_severe_pain():
    g = safety_gate(ENV, sig(pain_nrs=7))
    assert g.verdict is Verdict.ESCALATE and not g.llm_may_decide


def test_gate_escalates_on_quality_drop():
    g = safety_gate(ENV, sig(mean_peak_rom=45.0))  # 较基线降 35%
    assert g.verdict is Verdict.ESCALATE
    assert any("下降" in r for r in g.reasons)


def test_gate_escalates_on_inactivity():
    g = safety_gate(ENV, sig(days_since_last_session=4))
    assert g.verdict is Verdict.ESCALATE


def test_escalation_takes_precedence_over_stop():
    """同时命中停止与升级时必须升级, 不能降级处理。"""
    g = safety_gate(ENV, sig(pain_nrs=8, days_since_last_session=5))
    assert g.verdict is Verdict.ESCALATE
    assert len(g.reasons) >= 2


def test_gate_reasons_are_traceable():
    g = safety_gate(ENV, sig(pain_nrs=7))
    assert g.reasons and all(isinstance(r, str) and r for r in g.reasons)


# ---------------------------------------------------------------- 5. 模型输出夹紧


def test_llm_output_clamped_into_envelope():
    assert clamp_llm_output(ENV, 999, 400) == (20, 90)  # 上越界
    assert clamp_llm_output(ENV, 0, 5) == (10, 45)  # 下越界
    assert clamp_llm_output(ENV, 14, 65) == (14, 65)  # 框内原样通过


def test_llm_cannot_override_escalation():
    """闸门升级时, 无论模型输出什么都不得下发方案。"""
    gate, presc = decide(ENV, sig(pain_nrs=9), llm_reps=20, llm_rom=90, llm_line="继续加油")
    assert gate.verdict is Verdict.ESCALATE
    assert presc is None


def test_full_chain_produces_clamped_prescription():
    gate, presc = decide(ENV, sig(), llm_reps=99, llm_rom=180, llm_line="慢慢抬，我数着")
    assert gate.verdict is Verdict.PROCEED
    assert presc is not None
    assert presc.reps == 20 and presc.rom_target == 90
    assert "夹紧" in presc.rationale


# ---------------------------------------------------------------- 可读报告

if __name__ == "__main__":
    print("=" * 68)
    print("1. 关节角度解算（合成骨架，真值 vs 解算）")
    print("=" * 68)
    for t in (0, 30, 60, 90, 120):
        g = shoulder_abduction(make_landmarks(abduction_deg=t), "L")
        print(f"   肩外展 真值 {t:>3}°   解算 {g:>6.2f}°   误差 {abs(g - t):.3f}°")

    print("\n" + "=" * 68)
    print("2. 代偿检测")
    print("=" * 68)
    for s in (0, 8, 20):
        v = shrug_deg(make_landmarks(shrug=s))
        flag = "超容差 → 告警" if v > 12 else "容差内"
        print(f"   耸肩 真值 {s:>3}°   检出 {v:>6.2f}°   {flag}")

    print("\n" + "=" * 68)
    print("3. 计数状态机：抖动下 单阈值 vs 双阈值迟滞（真实 6 次）")
    print("=" * 68)
    for noise in (0, 5, 9, 14):
        seq = build_reps(6, 70, noise=noise, seed=7)
        c = RepCounter(up_thresh=45, down_thresh=20)
        for a in seq:
            c.update(a)
        print(
            f"   抖动 ±{noise:>2}°   单阈值计数 {count_naive(seq, 45):>3}   "
            f"迟滞计数 {c.reps:>3}"
        )

    print("\n" + "=" * 68)
    print("4. 确定性安全闸门（大模型不参与判定）")
    print("=" * 68)
    cases = [
        ("指标正常", sig()),
        ("疼痛 NRS 4", sig(pain_nrs=4)),
        ("疼痛 NRS 7", sig(pain_nrs=7)),
        ("活动度较基线降 35%", sig(mean_peak_rom=45.0)),
        ("连续 4 天未练", sig(days_since_last_session=4)),
        ("疼痛 8 且 5 天未练", sig(pain_nrs=8, days_since_last_session=5)),
    ]
    for name, s in cases:
        g = safety_gate(ENV, s)
        print(f"   {name:<20} → {g.verdict.value:<14} 模型可介入={g.llm_may_decide}")
        for r in g.reasons:
            print(f"        · {r}")

    print("\n" + "=" * 68)
    print("5. 模型输出夹紧（处方边界 10-20 次 / 45-90°）")
    print("=" * 68)
    for reps, rom in ((99, 180), (0, 5), (14, 65)):
        print(f"   模型建议 {reps:>3}次/{rom:>3}° → 实际下发 {clamp_llm_output(ENV, reps, rom)}")

    g, p = decide(ENV, sig(pain_nrs=9), 20, 90, "继续加油")
    print(f"\n   闸门升级时模型输出被丢弃: verdict={g.verdict.value}, 方案={p}")
