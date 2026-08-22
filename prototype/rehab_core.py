"""《复途》康复智能体 —— 核心算法原型。

这个文件用于验证赛道三方案的技术可行性, 只包含四块真正决定难度的逻辑:

  1. 关节角度解算      —— 纯几何, 由姿态关键点算临床角度
  2. 代偿检测          —— 耸肩 / 躯干侧倾, 阈值法
  3. 动作计数状态机    —— 带迟滞, 抗关键点抖动
  4. 确定性安全闸门    —— 升级判定不交给大模型, 由规则引擎独占

第 4 点是整个设计的关键: 大模型只在安全闸门放行后决定"练多少、怎么说",
任何停止 / 升级判定都由确定性规则先行, 大模型无权覆盖。
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from enum import Enum
from typing import Iterable, Sequence

# MediaPipe Pose 的 33 点索引, 只列本原型用到的
L_SHOULDER, R_SHOULDER = 11, 12
L_ELBOW, R_ELBOW = 13, 14
L_WRIST, R_WRIST = 15, 16
L_HIP, R_HIP = 23, 24
L_KNEE, R_KNEE = 25, 26
L_ANKLE, R_ANKLE = 27, 28

Point = tuple[float, float]


# ---------------------------------------------------------------- 1. 关节角度


def angle_3p(a: Point, b: Point, c: Point) -> float:
    """b 为顶点的三点夹角, 单位度。"""
    v1 = (a[0] - b[0], a[1] - b[1])
    v2 = (c[0] - b[0], c[1] - b[1])
    n1 = math.hypot(*v1)
    n2 = math.hypot(*v2)
    if n1 == 0 or n2 == 0:
        return float("nan")
    cos = max(-1.0, min(1.0, (v1[0] * v2[0] + v1[1] * v2[1]) / (n1 * n2)))
    return math.degrees(math.acos(cos))


def shoulder_abduction(lm: Sequence[Point], side: str = "L") -> float:
    """肩关节外展角: 上臂向量与躯干向量的夹角。"""
    sh, el, hip = (
        (L_SHOULDER, L_ELBOW, L_HIP) if side == "L" else (R_SHOULDER, R_ELBOW, R_HIP)
    )
    return angle_3p(lm[el], lm[sh], lm[hip])


def knee_extension(lm: Sequence[Point], side: str = "L") -> float:
    """膝关节角: 180 度为完全伸直。"""
    hip, knee, ankle = (
        (L_HIP, L_KNEE, L_ANKLE) if side == "L" else (R_HIP, R_KNEE, R_ANKLE)
    )
    return angle_3p(lm[hip], lm[knee], lm[ankle])


# ---------------------------------------------------------------- 2. 代偿检测


def shrug_deg(lm: Sequence[Point]) -> float:
    """双肩连线相对水平线的倾角, 用于识别患侧耸肩代偿。

    取分量绝对值, 使结果落在 [0, 90] 且与左右方向无关 —— 直接对
    (dy, dx) 取 atan2 会因左肩 x 小于右肩而算出接近 180 度的值。
    """
    ls, rs = lm[L_SHOULDER], lm[R_SHOULDER]
    return math.degrees(math.atan2(abs(ls[1] - rs[1]), abs(ls[0] - rs[0])))


def trunk_lean_deg(lm: Sequence[Point]) -> float:
    """肩中点-髋中点连线相对铅垂线的倾角, 用于识别躯干侧倾代偿。"""
    sx = (lm[L_SHOULDER][0] + lm[R_SHOULDER][0]) / 2
    sy = (lm[L_SHOULDER][1] + lm[R_SHOULDER][1]) / 2
    hx = (lm[L_HIP][0] + lm[R_HIP][0]) / 2
    hy = (lm[L_HIP][1] + lm[R_HIP][1]) / 2
    return abs(math.degrees(math.atan2(hx - sx, hy - sy)))


# ------------------------------------------------- 3. 动作计数状态机（带迟滞）


class Phase(Enum):
    REST = "rest"
    RISING = "rising"
    HOLD = "hold"


@dataclass
class RepCounter:
    """带迟滞的往复动作计数器。

    单阈值计数在关键点抖动时会疯狂误计数, 双阈值迟滞是必需的:
    只有越过 up_thresh 才算抬起, 只有回落到 down_thresh 以下才算完成一次。
    """

    up_thresh: float
    down_thresh: float
    hold_frames: int = 3

    reps: int = 0
    phase: Phase = Phase.REST
    _hold: int = 0
    peaks: list[float] = field(default_factory=list)
    _cur_peak: float = 0.0

    def __post_init__(self) -> None:
        if self.down_thresh >= self.up_thresh:
            raise ValueError("down_thresh 必须小于 up_thresh, 否则迟滞不成立")

    def update(self, angle: float) -> None:
        if math.isnan(angle):
            return

        if self.phase is Phase.REST:
            if angle >= self.up_thresh:
                self.phase = Phase.RISING
                self._cur_peak = angle
        elif self.phase is Phase.RISING:
            self._cur_peak = max(self._cur_peak, angle)
            if angle >= self.up_thresh:
                self._hold += 1
                if self._hold >= self.hold_frames:
                    self.phase = Phase.HOLD
            else:
                self._hold = 0
                if angle <= self.down_thresh:
                    self.phase = Phase.REST  # 未达保持时长, 不计数
        elif self.phase is Phase.HOLD:
            self._cur_peak = max(self._cur_peak, angle)
            if angle <= self.down_thresh:
                self.reps += 1
                self.peaks.append(self._cur_peak)
                self.phase = Phase.REST
                self._hold = 0
                self._cur_peak = 0.0


def count_naive(angles: Iterable[float], thresh: float) -> int:
    """单阈值计数, 仅用于对照, 展示不做迟滞的后果。"""
    n, above = 0, False
    for a in angles:
        if not above and a >= thresh:
            above = True
        elif above and a < thresh:
            n += 1
            above = False
    return n


# ------------------------------------------------- 4. 确定性安全闸门（不可绕过）


@dataclass
class Envelope:
    """治疗师设定的处方边界。大模型只能在这个框内活动。"""

    reps_min: int
    reps_target: int
    reps_max: int
    rom_floor: float
    rom_target: float
    rom_ceiling: float
    shrug_tolerance_deg: float
    trunk_lean_tolerance_deg: float
    stop_pain_nrs: int
    escalate_pain_nrs: int
    escalate_quality_drop_pct: float
    escalate_no_activity_days: int


@dataclass
class SessionSignals:
    pain_nrs: int
    mean_peak_rom: float
    baseline_rom: float
    compensation_rate: float
    completed_reps: int
    days_since_last_session: int


class Verdict(Enum):
    PROCEED = "proceed"
    STOP_SESSION = "stop_session"
    ESCALATE = "escalate"


@dataclass
class GateResult:
    verdict: Verdict
    reasons: list[str]

    @property
    def llm_may_decide(self) -> bool:
        """只有 PROCEED 才允许大模型参与决策。"""
        return self.verdict is Verdict.PROCEED


def safety_gate(env: Envelope, sig: SessionSignals) -> GateResult:
    """升级与停止判定。纯规则, 无模型参与, 输出可逐条追溯。

    漏报远比误报危险, 因此任一条命中即升级, 不做加权平均。
    """
    escalate: list[str] = []
    stop: list[str] = []

    if sig.pain_nrs >= env.escalate_pain_nrs:
        escalate.append(f"疼痛 NRS {sig.pain_nrs} ≥ 升级阈值 {env.escalate_pain_nrs}")
    if sig.days_since_last_session >= env.escalate_no_activity_days:
        escalate.append(
            f"连续 {sig.days_since_last_session} 天未训练 "
            f"≥ 阈值 {env.escalate_no_activity_days}"
        )
    if sig.baseline_rom > 0:
        drop = (sig.baseline_rom - sig.mean_peak_rom) / sig.baseline_rom * 100
        if drop >= env.escalate_quality_drop_pct:
            escalate.append(
                f"活动度较基线下降 {drop:.0f}% ≥ 阈值 {env.escalate_quality_drop_pct:.0f}%"
            )
    if escalate:
        return GateResult(Verdict.ESCALATE, escalate)

    if sig.pain_nrs >= env.stop_pain_nrs:
        stop.append(f"疼痛 NRS {sig.pain_nrs} ≥ 停止阈值 {env.stop_pain_nrs}")
    if stop:
        return GateResult(Verdict.STOP_SESSION, stop)

    return GateResult(Verdict.PROCEED, ["各项指标位于处方边界内"])


# ------------------------------------------------- 决策层与大模型的契约


@dataclass
class Prescription:
    """交给患者执行的当日方案。字段全部被 Envelope 夹紧。"""

    reps: int
    rom_target: float
    coaching_line: str
    rationale: str


def clamp_llm_output(env: Envelope, reps: int, rom_target: float) -> tuple[int, float]:
    """大模型输出的数值一律夹紧到处方边界内, 越界即截断而非信任。"""
    return (
        max(env.reps_min, min(env.reps_max, reps)),
        max(env.rom_floor, min(env.rom_ceiling, rom_target)),
    )


def decide(
    env: Envelope,
    sig: SessionSignals,
    llm_reps: int,
    llm_rom: float,
    llm_line: str,
) -> tuple[GateResult, Prescription | None]:
    """完整决策链: 安全闸门先行, 大模型只在放行后参与, 且输出被夹紧。"""
    gate = safety_gate(env, sig)
    if not gate.llm_may_decide:
        return gate, None
    reps, rom = clamp_llm_output(env, llm_reps, llm_rom)
    return gate, Prescription(
        reps=reps,
        rom_target=rom,
        coaching_line=llm_line,
        rationale=f"闸门放行({gate.reasons[0]}); 模型建议 {llm_reps}次/{llm_rom:.0f}° "
        f"夹紧后为 {reps}次/{rom:.0f}°",
    )
