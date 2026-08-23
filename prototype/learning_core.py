"""《学径AI》—— 掌握度建模与学习路径引擎。

设计原则与 rehab_core.py 一致: **路径决策由确定性引擎独占, 大模型不参与。**
大模型只负责生成内容（题目变式、提示文本、错因解释、学习总结），
"学什么 / 为什么学 / 什么时候复习" 全部由本模块计算, 且每一步可解释。

三块成熟方法, 不自创:

  1. BKT (Bayesian Knowledge Tracing) —— 掌握度后验估计
     Corbett & Anderson 1995 的四参数模型: 先验 L0 / 学习率 T / 猜对率 G / 失误率 S
     选它的理由: 参数可解释, 无需训练数据, 几十行可实现。
     DKT 之类需要大规模历史数据, 三天内没有数据可训, 不适用。

  2. 提示依赖度作为观测证据 —— 本作品的核心信号
     "答对" 不是一个二值事件。在提示阶梯下, 越高级别的提示意味着答对越不能
     说明掌握: 用提示等级抬高该次观测的等效猜对率 G_eff。
     最高级提示 (直接看完整解答) 后答对, 按智能辅导系统的通行做法
     (bottom-out hint) 记为未掌握证据。

  3. FSRS 风格的间隔复习 —— 依表现动态排期
     幂律遗忘曲线 R(t) = (1 + t/(9S))^-1, 稳定度 S 随独立成功检索增长、
     随失败回落。目标保持率 0.9 时复习间隔恰好约等于 S 天。
     不使用 "第 1/2/4/7 天" 这类固定表格, 也不宣称遵循艾宾浩斯曲线。
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from enum import Enum

# --------------------------------------------------------------- 提示阶梯


class Hint(Enum):
    """分级提示。级别越高, 答对所能证明的掌握越少。"""

    NONE = 0  # 独立作答
    LOCATE = 1  # 提醒检查哪个知识点
    DIRECTION = 2  # 给出解题方向
    EXAMPLE = 3  # 展示相似例子
    SOLUTION = 4  # 展示完整解答（bottom-out）


#: 各提示级别对应的等效猜对率上限。级别越高越接近 1, 即答对几乎不含掌握信息。
_GUESS_BY_HINT = {
    Hint.NONE: 0.00,
    Hint.LOCATE: 0.25,
    Hint.DIRECTION: 0.50,
    Hint.EXAMPLE: 0.75,
}


# --------------------------------------------------------------- BKT 参数


@dataclass(frozen=True)
class BKTParams:
    """单个知识点的 BKT 参数。由教师或题库标注给出, 不由模型生成。"""

    p_init: float = 0.25  # 先验掌握概率 p(L0)
    p_learn: float = 0.18  # 单次练习的学习率 p(T)
    p_guess: float = 0.20  # 未掌握时猜对率 p(G)
    p_slip: float = 0.10  # 已掌握时失误率 p(S)

    def __post_init__(self) -> None:
        for name in ("p_init", "p_learn", "p_guess", "p_slip"):
            v = getattr(self, name)
            if not 0.0 <= v <= 1.0:
                raise ValueError(f"{name} 必须在 [0,1]: {v}")
        if self.p_guess + self.p_slip >= 1.0:
            # 否则模型退化: 答对反而降低掌握估计
            raise ValueError("p_guess + p_slip 必须小于 1, 否则 BKT 退化")


# --------------------------------------------------------------- 知识点状态


@dataclass
class SkillState:
    """一个学生在一个知识点上的状态。"""

    skill: str
    params: BKTParams = field(default_factory=BKTParams)
    mastery: float | None = None  # p(L), None 表示尚未初始化
    stability: float = 0.0  # 记忆稳定度, 单位天
    reps: int = 0  # 成功独立检索次数
    lapses: int = 0  # 失败次数
    consecutive_failures: int = 0  # 连续未通过次数, 用于触发回退到前置
    last_seen_day: float | None = None
    history: list[tuple[bool, Hint]] = field(default_factory=list)

    def __post_init__(self) -> None:
        if self.mastery is None:
            self.mastery = self.params.p_init

    # ---------------------------------------------------------- BKT 更新

    def _effective_guess(self, hint: Hint) -> float:
        """把提示等级折算成本次观测的等效猜对率。"""
        base = self.params.p_guess
        ceiling = _GUESS_BY_HINT[hint]
        # 提示只会让题变得更容易猜对, 不会更难
        return max(base, base + (1.0 - base) * ceiling)

    def observe(self, correct: bool, hint: Hint, day: float) -> dict:
        """吸收一次作答, 返回可解释的更新说明。"""
        prior = self.mastery
        assert prior is not None

        # bottom-out: 看了完整解答才答对, 记为未掌握证据
        counted_correct = correct and hint is not Hint.SOLUTION
        downgraded = correct and hint is Hint.SOLUTION

        g = self._effective_guess(hint if hint is not Hint.SOLUTION else Hint.NONE)
        s = self.params.p_slip

        if counted_correct:
            num = prior * (1 - s)
            den = num + (1 - prior) * g
        else:
            num = prior * s
            den = num + (1 - prior) * (1 - g)
        posterior = num / den if den > 0 else prior

        # 学习转移: 本次练习本身带来掌握的可能
        self.mastery = posterior + (1 - posterior) * self.params.p_learn

        self._update_stability(counted_correct, hint, day)
        self.history.append((correct, hint))
        self.last_seen_day = day

        return {
            "skill": self.skill,
            "prior": prior,
            "posterior": self.mastery,
            "correct": correct,
            "hint": hint.name,
            "counted_as_correct": counted_correct,
            "bottom_out_downgraded": downgraded,
            "effective_guess": g,
            "stability_days": self.stability,
        }

    # ---------------------------------------------------- 稳定度与复习排期

    def _update_stability(self, counted_correct: bool, hint: Hint, day: float) -> None:
        if not counted_correct:
            self.lapses += 1
            self.consecutive_failures += 1
            # 失败后不清零, 但大幅回落, 且不低于半天
            self.stability = max(0.5, self.stability * 0.3)
            return

        self.consecutive_failures = 0
        self.reps += 1
        # 独立答对增长最多; 依赖提示则增长打折
        gain = {
            Hint.NONE: 2.4,
            Hint.LOCATE: 1.8,
            Hint.DIRECTION: 1.4,
            Hint.EXAMPLE: 1.15,
        }[hint]
        # 掌握度越高, 同一次成功带来的稳定度增长越大
        assert self.mastery is not None
        gain *= 0.6 + 0.8 * self.mastery
        self.stability = max(1.0, self.stability * gain) if self.stability else 1.0 * gain

    def retrievability(self, day: float) -> float:
        """幂律遗忘曲线下的当前可提取概率。"""
        if self.last_seen_day is None or self.stability <= 0:
            return 0.0
        t = max(0.0, day - self.last_seen_day)
        return (1.0 + t / (9.0 * self.stability)) ** -1.0

    def due_day(self, target_retention: float = 0.9) -> float | None:
        """下次复习时间: 可提取概率跌到目标保持率的那一天。"""
        if self.last_seen_day is None or self.stability <= 0:
            return None
        interval = 9.0 * self.stability * (1.0 / target_retention - 1.0)
        return self.last_seen_day + interval


# --------------------------------------------------------------- 路径引擎


class Action(Enum):
    REMEDIATE = "remediate"  # 补前置知识
    PRACTICE = "practice"  # 标准练习
    REVIEW = "review"  # 到期复习
    TRANSFER = "transfer"  # 迁移应用
    GRADUATE = "graduate"  # 暂时毕业


@dataclass
class Decision:
    action: Action
    skill: str
    reason: str
    review_in_days: float | None = None


@dataclass
class Curriculum:
    """教师确认的知识点与前置关系。作品的教学目标覆盖以此为准。"""

    prereqs: dict[str, list[str]]
    importance: dict[str, float] = field(default_factory=dict)
    mastery_threshold: float = 0.85
    stable_reps: int = 2
    #: 连续答错达此次数即回退到前置知识, 而不是继续刷同类题
    fallback_after_failures: int = 3

    def weight(self, skill: str) -> float:
        return self.importance.get(skill, 1.0)


class PathEngine:
    """确定性路径决策。大模型无权改变这里的任何判断。"""

    def __init__(self, curriculum: Curriculum) -> None:
        self.cur = curriculum

    def weakest_unmet_prereq(
        self, skill: str, states: dict[str, SkillState]
    ) -> str | None:
        """按拓扑向上找第一个未达阈值的前置知识点（掌握学习原则）。"""
        for p in self.cur.prereqs.get(skill, []):
            st = states.get(p)
            if st is None:
                return p
            deeper = self.weakest_unmet_prereq(p, states)
            if deeper is not None:
                return deeper
            if st.mastery is not None and st.mastery < self.cur.mastery_threshold:
                return p
        return None

    def review_queue(
        self, states: dict[str, SkillState], day: float
    ) -> list[tuple[str, float]]:
        """按 "快要遗忘且重要" 排序的复习队列。

        优先级 = 重要性 x (1 - 可提取概率), 只收到期的项。
        """
        out: list[tuple[str, float]] = []
        for name, st in states.items():
            due = st.due_day()
            if due is None or day < due:
                continue
            urgency = self.cur.weight(name) * (1.0 - st.retrievability(day))
            out.append((name, urgency))
        return sorted(out, key=lambda x: -x[1])

    def next_action(
        self, target_skill: str, states: dict[str, SkillState], day: float
    ) -> Decision:
        # 1) 学生正卡在某个知识点上: 连续答错要回退到前置, 不能继续刷同类题。
        #    此时前置的掌握度估计即便在阈值之上, 也已被反复失败所质疑。
        cur = states.get(target_skill)
        if cur is not None and cur.consecutive_failures >= self.cur.fallback_after_failures:
            direct = self.cur.prereqs.get(target_skill, [])
            if direct:
                weakest = min(
                    direct, key=lambda p: states[p].mastery if p in states else 0.0
                )
                m = states[weakest].mastery if weakest in states else 0.0
                assert m is not None
                return Decision(
                    Action.REMEDIATE,
                    weakest,
                    f"连续答错 {cur.consecutive_failures} 次 "
                    f"(≥{self.cur.fallback_after_failures}), 回退到前置知识点 "
                    f"(当前掌握度 {m:.0%}), 不继续刷同类题",
                )

        # 2) 到期复习优先于新内容
        queue = self.review_queue(states, day)
        if queue:
            name, urgency = queue[0]
            r = states[name].retrievability(day)
            return Decision(
                Action.REVIEW,
                name,
                f"已到期且最紧急: 可提取概率 {r:.0%}, 重要性 "
                f"{self.cur.weight(name):.1f}, 紧急度 {urgency:.2f}",
            )

        # 3) 前置未达阈值则先补缺, 不进入后续内容
        gap = self.weakest_unmet_prereq(target_skill, states)
        if gap is not None:
            m = states[gap].mastery if gap in states else 0.0
            assert m is not None
            return Decision(
                Action.REMEDIATE,
                gap,
                f"前置知识点掌握度 {m:.0%} < 阈值 "
                f"{self.cur.mastery_threshold:.0%}, 先补缺",
            )

        st = states.get(target_skill)
        if st is None or st.mastery is None:
            return Decision(Action.PRACTICE, target_skill, "尚无作答记录, 从标准练习开始")

        # 4) 目标知识点本身
        if st.mastery < self.cur.mastery_threshold:
            return Decision(
                Action.PRACTICE,
                target_skill,
                f"掌握度 {st.mastery:.0%} < 阈值 "
                f"{self.cur.mastery_threshold:.0%}, 继续标准练习",
            )
        if st.reps < self.cur.stable_reps:
            return Decision(
                Action.PRACTICE,
                target_skill,
                f"掌握度已达 {st.mastery:.0%}, 但独立答对仅 {st.reps} 次 "
                f"(需 {self.cur.stable_reps} 次), 再练以确认稳定",
            )
        due = st.due_day()
        gap_days = None if due is None else due - day
        if st.reps >= self.cur.stable_reps + 1:
            return Decision(
                Action.GRADUATE,
                target_skill,
                f"稳定掌握 (掌握度 {st.mastery:.0%}, 独立答对 {st.reps} 次), 暂时毕业",
                gap_days,
            )
        return Decision(
            Action.TRANSFER,
            target_skill,
            f"掌握度 {st.mastery:.0%} 且独立答对 {st.reps} 次, 进入迁移应用",
            gap_days,
        )


# --------------------------------------------------------------- 班级共性问题


def class_summary(
    per_student: dict[str, dict[str, SkillState]],
    curriculum: Curriculum,
) -> list[dict]:
    """按知识点汇总班级学情, 供教师决定课堂先讲什么。

    只做确定性统计, 大模型仅用于把统计结果写成自然语言摘要。
    """
    skills = {s for st in per_student.values() for s in st}
    rows = []
    for s in sorted(skills):
        vals = [
            st[s].mastery
            for st in per_student.values()
            if s in st and st[s].mastery is not None
        ]
        hint_dep = [
            sum(1 for _, h in st[s].history if h in (Hint.EXAMPLE, Hint.SOLUTION))
            for st in per_student.values()
            if s in st
        ]
        n = len(vals)
        if n == 0:
            continue
        below = sum(1 for v in vals if v < curriculum.mastery_threshold)
        rows.append(
            {
                "skill": s,
                "n": n,
                "mean_mastery": sum(vals) / n,
                "below_threshold_pct": below / n * 100,
                "heavy_hint_events": sum(hint_dep),
                "importance": curriculum.weight(s),
            }
        )
    # 未达标比例 x 重要性, 决定课堂优先级
    return sorted(
        rows, key=lambda r: -(r["below_threshold_pct"] / 100 * r["importance"])
    )
