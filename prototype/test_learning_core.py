"""掌握度建模与路径引擎验证。

运行: python3 -m pytest prototype/test_learning_core.py -q
或直接: python3 prototype/test_learning_core.py  查看可读报告
"""

from __future__ import annotations

from learning_core import (
    Action,
    BKTParams,
    Curriculum,
    Hint,
    PathEngine,
    SkillState,
    class_summary,
)

# 演示单元: Python 条件与循环, 6 个知识点 + 前置关系
CURRICULUM = Curriculum(
    prereqs={
        "比较运算": [],
        "布尔逻辑": ["比较运算"],
        "if_else": ["布尔逻辑"],
        "while循环": ["if_else"],
        "循环边界": ["while循环"],
        "break_continue": ["while循环"],
    },
    importance={"循环边界": 1.6, "if_else": 1.3, "布尔逻辑": 1.2},
    mastery_threshold=0.85,
    stable_reps=2,
)


def fresh(skill: str, **kw) -> SkillState:
    return SkillState(skill=skill, params=BKTParams(**kw))


# ----------------------------------------------------------- BKT 基本性质


def test_correct_raises_mastery_incorrect_lowers():
    s = fresh("if_else")
    base = s.mastery
    s.observe(True, Hint.NONE, day=0)
    assert s.mastery > base

    t = fresh("if_else")
    base_t = t.mastery
    t.observe(False, Hint.NONE, day=0)
    assert t.mastery < base_t


def test_mastery_stays_in_unit_interval():
    s = fresh("if_else")
    for i in range(40):
        s.observe(i % 3 != 0, Hint.NONE, day=i)
        assert 0.0 <= s.mastery <= 1.0


def test_degenerate_params_rejected():
    """p_guess + p_slip >= 1 时答对反而降低掌握估计, 必须拒绝。"""
    for bad in ({"p_guess": 0.6, "p_slip": 0.5}, {"p_guess": 0.9, "p_slip": 0.1}):
        try:
            BKTParams(**bad)
        except ValueError:
            continue
        raise AssertionError(f"应拒绝退化参数 {bad}")


# ------------------------------------------- 提示依赖度作为观测证据（核心）


def test_higher_hint_yields_lower_posterior():
    """同样答对, 用的提示越高级, 掌握度涨得越少。"""
    posts = []
    for h in (Hint.NONE, Hint.LOCATE, Hint.DIRECTION, Hint.EXAMPLE):
        s = fresh("if_else")
        s.observe(True, h, day=0)
        posts.append(s.mastery)
    assert posts == sorted(posts, reverse=True), posts
    assert posts[0] - posts[-1] > 0.2, "提示级别的区分度过小, 信号无意义"


def test_bottom_out_hint_does_not_credit_mastery():
    """看了完整解答才答对, 不能算掌握 —— 掌握度必须低于作答前。"""
    s = fresh("if_else")
    before = s.mastery
    info = s.observe(True, Hint.SOLUTION, day=0)
    assert info["bottom_out_downgraded"] is True
    assert info["counted_as_correct"] is False
    assert s.mastery < before, f"{s.mastery} 应低于 {before}"


def test_answer_correctness_alone_is_insufficient():
    """三次全对但全靠例子提示, 不应达到掌握阈值。"""
    s = fresh("if_else")
    for d in range(3):
        s.observe(True, Hint.EXAMPLE, day=d)
    assert s.mastery < CURRICULUM.mastery_threshold, s.mastery


def test_independent_success_reaches_mastery():
    s = fresh("if_else")
    for d in range(3):
        s.observe(True, Hint.NONE, day=d)
    assert s.mastery >= CURRICULUM.mastery_threshold, s.mastery


# ----------------------------------------------------- 稳定度与复习排期


def test_independent_success_extends_interval():
    s = fresh("循环边界")
    intervals = []
    for d in range(4):
        s.observe(True, Hint.NONE, day=d)
        due = s.due_day()
        assert due is not None
        intervals.append(due - d)
    assert intervals == sorted(intervals), intervals


def test_failure_shortens_interval():
    s = fresh("循环边界")
    for d in range(3):
        s.observe(True, Hint.NONE, day=d)
    long_iv = s.due_day() - 2
    s.observe(False, Hint.NONE, day=3)
    short_iv = s.due_day() - 3
    assert short_iv < long_iv / 2, (short_iv, long_iv)


def test_retrievability_decays_monotonically():
    s = fresh("if_else")
    s.observe(True, Hint.NONE, day=0)
    rs = [s.retrievability(day=t) for t in (0, 1, 3, 7, 30)]
    assert rs == sorted(rs, reverse=True), rs
    assert rs[0] == 1.0 and rs[-1] < 0.5


def test_due_interval_matches_target_retention():
    """在到期日, 可提取概率应恰好落在目标保持率附近。"""
    s = fresh("if_else")
    s.observe(True, Hint.NONE, day=0)
    due = s.due_day(target_retention=0.9)
    assert abs(s.retrievability(due) - 0.9) < 1e-6


# ------------------------------------------------- 掌握学习: 前置门控


def test_weak_prerequisite_blocks_advancement():
    states = {
        "比较运算": fresh("比较运算"),
        "布尔逻辑": fresh("布尔逻辑"),
        "if_else": fresh("if_else"),
    }
    for d in range(3):  # 只有比较运算练熟
        states["比较运算"].observe(True, Hint.NONE, day=d)
    eng = PathEngine(CURRICULUM)
    d = eng.next_action("if_else", states, day=3)
    assert d.action is Action.REMEDIATE
    assert d.skill == "布尔逻辑", d
    assert "前置" in d.reason


def test_deepest_gap_is_targeted_first():
    """多层前置都薄弱时, 应先补最底层, 而不是就近的一层。"""
    states = {k: fresh(k) for k in ("比较运算", "布尔逻辑", "if_else", "while循环")}
    eng = PathEngine(CURRICULUM)
    d = eng.next_action("while循环", states, day=0)
    assert d.skill == "比较运算", d


def test_repeated_failure_falls_back_to_prerequisite():
    """连续答错不应继续刷同类题, 而应回到前置知识。"""
    states = {k: fresh(k) for k in ("比较运算", "布尔逻辑", "if_else")}
    for d in range(4):
        states["比较运算"].observe(True, Hint.NONE, day=d)
        states["布尔逻辑"].observe(True, Hint.NONE, day=d)
    eng = PathEngine(CURRICULUM)
    assert eng.next_action("if_else", states, day=4).action is Action.PRACTICE

    for d in range(4, 8):  # if_else 连续答错 4 次
        states["if_else"].observe(False, Hint.NONE, day=d)
    assert states["if_else"].consecutive_failures == 4
    d2 = eng.next_action("if_else", states, day=8)
    assert d2.action is Action.REMEDIATE, d2
    assert d2.skill == "布尔逻辑", d2
    assert "连续答错" in d2.reason
    assert states["if_else"].mastery < 0.3


def test_one_success_clears_failure_streak():
    states = {k: fresh(k) for k in ("比较运算", "布尔逻辑", "if_else")}
    for d in range(3):
        states["if_else"].observe(False, Hint.NONE, day=d)
    assert states["if_else"].consecutive_failures == 3
    states["if_else"].observe(True, Hint.NONE, day=3)
    assert states["if_else"].consecutive_failures == 0


def test_failure_streak_preempts_due_review():
    """学生正卡住时, 回退前置优先于常规到期复习。"""
    states = {k: fresh(k) for k in ("比较运算", "布尔逻辑", "if_else")}
    for d in range(3):
        states["布尔逻辑"].observe(True, Hint.NONE, day=d)
    for d in range(3, 7):
        states["if_else"].observe(False, Hint.NONE, day=d)
    eng = PathEngine(CURRICULUM)
    d = eng.next_action("if_else", states, day=500.0)  # 复习早已到期
    assert d.action is Action.REMEDIATE, d


def test_progression_to_transfer_and_graduate():
    states = {k: fresh(k) for k in ("比较运算", "布尔逻辑", "if_else")}
    for d in range(4):
        for k in ("比较运算", "布尔逻辑"):
            states[k].observe(True, Hint.NONE, day=d)
    for d in range(3):
        states["if_else"].observe(True, Hint.NONE, day=d)
    eng = PathEngine(CURRICULUM)
    act = eng.next_action("if_else", states, day=0.1).action
    assert act in (Action.TRANSFER, Action.GRADUATE), act


# ------------------------------------------------- 复习队列优先级


def test_review_takes_precedence_over_new_content():
    states = {k: fresh(k) for k in ("比较运算", "布尔逻辑", "if_else")}
    for d in range(3):
        states["比较运算"].observe(True, Hint.NONE, day=d)
    eng = PathEngine(CURRICULUM)
    far_future = 400.0
    d = eng.next_action("if_else", states, day=far_future)
    assert d.action is Action.REVIEW, d


def test_queue_prefers_important_and_forgettable():
    """同等遗忘程度下, 重要性高的排前面。"""
    states = {}
    for k in ("循环边界", "break_continue"):
        st = fresh(k)
        st.observe(True, Hint.NONE, day=0)
        states[k] = st
    eng = PathEngine(CURRICULUM)
    q = eng.review_queue(states, day=200.0)
    assert q and q[0][0] == "循环边界", q  # importance 1.6 vs 1.0


def test_empty_queue_before_due():
    s = fresh("if_else")
    s.observe(True, Hint.NONE, day=0)
    eng = PathEngine(CURRICULUM)
    assert eng.review_queue({"if_else": s}, day=0.1) == []


# ------------------------------------------------- 班级共性问题


def build_class(n: int = 10) -> dict[str, dict[str, SkillState]]:
    """全班 if_else 都不过; 循环边界一半真掌握、一半靠例子提示。"""
    per: dict[str, dict[str, SkillState]] = {}
    for i in range(n):
        a = fresh("if_else")
        a.observe(False, Hint.NONE, day=0)
        b = fresh("循环边界")
        if i < n // 2:
            for d in range(3):  # 独立答对, 真掌握
                b.observe(True, Hint.NONE, day=d)
        else:
            for d in range(3):  # 全对但靠例子提示, 不算掌握
                b.observe(True, Hint.EXAMPLE, day=d)
        per[f"s{i}"] = {"if_else": a, "循环边界": b}
    return per


def test_class_summary_ranks_by_gap_and_importance():
    rows = class_summary(build_class(), CURRICULUM)
    by = {r["skill"]: r for r in rows}
    assert by["if_else"]["below_threshold_pct"] == 100.0
    assert by["循环边界"]["below_threshold_pct"] == 50.0
    # 100% x 1.3 > 50% x 1.6, 缺口更大者优先
    assert rows[0]["skill"] == "if_else", rows
    assert by["if_else"]["n"] == 10


def test_summary_surfaces_hint_dependence():
    """靠提示答对的学生必须在摘要里留下痕迹, 否则教师会误判已掌握。"""
    by = {r["skill"]: r for r in class_summary(build_class(), CURRICULUM)}
    assert by["循环边界"]["heavy_hint_events"] == 15  # 5 人 x 3 次 EXAMPLE
    assert by["if_else"]["heavy_hint_events"] == 0


def test_equal_gap_higher_importance_ranks_first():
    per: dict[str, dict[str, SkillState]] = {}
    for i in range(6):
        x = fresh("循环边界")  # importance 1.6
        y = fresh("break_continue")  # importance 1.0
        x.observe(False, Hint.NONE, day=0)
        y.observe(False, Hint.NONE, day=0)
        per[f"s{i}"] = {"循环边界": x, "break_continue": y}
    rows = class_summary(per, CURRICULUM)
    assert rows[0]["skill"] == "循环边界", rows


# ------------------------------------------------- 大模型的边界


def test_engine_decisions_carry_explanations():
    """每个决策都必须带可追溯的理由, 用于向学生和教师解释。"""
    states = {k: fresh(k) for k in ("比较运算", "布尔逻辑", "if_else")}
    eng = PathEngine(CURRICULUM)
    d = eng.next_action("if_else", states, day=0)
    assert d.reason and any(c.isdigit() for c in d.reason), d.reason


# ------------------------------------------------------------ 可读报告

if __name__ == "__main__":
    print("=" * 74)
    print("1. 同样答对, 提示级别越高, 掌握度涨得越少（先验 25%）")
    print("=" * 74)
    for h in (Hint.NONE, Hint.LOCATE, Hint.DIRECTION, Hint.EXAMPLE, Hint.SOLUTION):
        s = fresh("if_else")
        info = s.observe(True, h, day=0)
        tag = "  ← 看完整解答, 记为未掌握" if info["bottom_out_downgraded"] else ""
        print(
            f"   {h.name:<10} 等效猜对率 {info['effective_guess']:.2f}   "
            f"掌握度 25% → {s.mastery:5.1%}{tag}"
        )

    print("\n" + "=" * 74)
    print("2. 关键演示: 两名学生答题全对, 唯一差别是提示依赖")
    print("=" * 74)
    a, b = fresh("if_else"), fresh("if_else")
    for d in range(3):
        a.observe(True, Hint.NONE, day=d)
        b.observe(True, Hint.EXAMPLE, day=d)
    for name, st in (("学生A 独立答对x3", a), ("学生B 靠例子提示x3", b)):
        due = st.due_day()
        print(
            f"   {name:<18} 掌握度 {st.mastery:5.1%}   稳定度 {st.stability:5.1f} 天   "
            f"下次复习 第 {due:.1f} 天（间隔 {due - 2:.1f} 天）"
        )
    print(
        f"\n   同样 3 题全对, 掌握度差 {abs(a.mastery - b.mastery):.1%}, "
        f"复习间隔差 {(a.due_day() - b.due_day()):.1f} 天。"
    )
    print("   这就是它区别于「AI 出题网站」的地方: 答对不等于会了。")

    print("\n" + "=" * 74)
    print("3. 掌握学习: 前置未达标时不放行")
    print("=" * 74)
    states = {k: fresh(k) for k in CURRICULUM.prereqs}
    eng = PathEngine(CURRICULUM)
    d = eng.next_action("循环边界", states, day=0)
    print(f"   目标「循环边界」, 全部零基础 → {d.action.value}「{d.skill}」")
    print(f"      理由: {d.reason}")
    for k in ("比较运算", "布尔逻辑", "if_else"):
        for day in range(3):
            states[k].observe(True, Hint.NONE, day=day)
    d = eng.next_action("循环边界", states, day=0.1)
    print(f"\n   补齐前三个前置后 → {d.action.value}「{d.skill}」")
    print(f"      理由: {d.reason}")

    print("\n" + "=" * 74)
    print("4. 连续答错: 回退前置, 不继续刷同类题")
    print("=" * 74)
    st3 = {k: fresh(k) for k in ("比较运算", "布尔逻辑", "if_else")}
    for k in ("比较运算", "布尔逻辑"):
        for day in range(4):
            st3[k].observe(True, Hint.NONE, day=day)
    for i in range(1, 5):
        st3["if_else"].observe(False, Hint.NONE, day=3 + i)
        d = eng.next_action("if_else", st3, day=3 + i + 0.1)
        print(
            f"   第 {i} 次答错后 (掌握度 {st3['if_else'].mastery:5.1%}) → "
            f"{d.action.value}「{d.skill}」"
        )
    print(f"      理由: {d.reason}")

    print("\n" + "=" * 74)
    print("5. 复习队列: 快要遗忘且重要的排前面（第 200 天）")
    print("=" * 74)
    st2 = {}
    for k in ("循环边界", "break_continue", "if_else"):
        s = fresh(k)
        s.observe(True, Hint.NONE, day=0)
        st2[k] = s
    for name, urg in eng.review_queue(st2, day=200.0):
        r = st2[name].retrievability(200.0)
        print(
            f"   {name:<16} 重要性 {CURRICULUM.weight(name):.1f}   "
            f"可提取概率 {r:5.1%}   紧急度 {urg:.3f}"
        )

    print("\n" + "=" * 74)
    print("6. 班级共性问题（10 人; 循环边界一半真掌握、一半靠提示答对）")
    print("=" * 74)
    print(f"   {'知识点':<14}{'人数':>5}{'平均掌握':>10}{'未达标':>9}{'重度依赖提示':>13}")
    for r in class_summary(build_class(), CURRICULUM):
        print(
            f"   {r['skill']:<14}{r['n']:>5}{r['mean_mastery']:>10.1%}"
            f"{r['below_threshold_pct']:>8.0f}%{r['heavy_hint_events']:>13}"
        )
    print("\n   排序 = 未达标比例 x 重要性, 即教师课堂上最该先讲的那个。")
    print("   「重度依赖提示」一列的意义: 5 名学生全对但靠例子, 若只看正确率")
    print("   会被误判为已掌握 —— 这是普通答题系统看不见的信息。")
