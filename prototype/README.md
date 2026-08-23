# prototype — 赛道三候选作品的核心算法原型

两套原型，共用一个设计原则：**确定性引擎独占关键决策，大模型只在边界内生成内容。**

## A. 《学径AI》学习路径引擎

方案评估见 [`docs/08-学径AI方案评估与改进.md`](../docs/08-学径AI方案评估与改进.md)。

| 文件 | 内容 |
| --- | --- |
| `learning_core.py` | BKT 掌握度估计、提示依赖度作为观测证据、幂律遗忘曲线排期、前置门控、连续答错回退、班级共性问题汇总 |
| `test_learning_core.py` | 24 个单元测试；直接运行可打印六段验证报告 |

关键结论（实测）：两名学生**三题全对、唯一差别是提示依赖**，掌握度 98.4% vs 64.2%，
复习间隔 29.1 天 vs 1.6 天。答对不等于会了。

不用 DKT（需大规模训练数据），不提艾宾浩斯曲线（材料是无意义音节，
「1/2/4/7 天」是民间口诀）。用 BKT + FSRS 风格幂律曲线，参数可向教师逐条解释。

## B. 《复途》康复智能体

技术可行性评估见 [`docs/07-赛道三技术可行性与手机要求.md`](../docs/07-赛道三技术可行性与手机要求.md)。

| 文件 | 内容 |
| --- | --- |
| `rehab_core.py` | 关节角度解算、代偿检测、带迟滞的计数状态机、确定性安全闸门、模型输出夹紧 |
| `test_rehab_core.py` | 19 个单元测试；直接运行可打印逐项验证报告 |
| `e2e_pose.py` | 端到端：真实图像 → MediaPipe 关键点 → 临床角度 → 代偿判定 → 决策 → 标注图 |
| `bench_pose.py` | 三档姿态模型的体积与单帧推理延迟基准 |

## 设计要点

**安全判定不交给大模型。** `safety_gate()` 是纯规则引擎，疼痛超阈、活动度骤降、连续未训练任一命中即升级，无模型参与、理由逐条可追溯。大模型只在闸门放行后决定「练多少、怎么说」，且数值输出被 `clamp_llm_output()` 夹紧到治疗师设定的处方边界内。闸门升级时模型输出直接丢弃。

**计数必须带迟滞。** 单阈值计数在关键点抖动 ±14° 时会把 6 次动作数成 12 次。双阈值迟滞加保持帧数要求可消除该问题，见 `test_hysteresis_beats_naive_under_jitter`。

**角度用归一化坐标解算**，结果与摄像头分辨率无关。

**提示依赖度必须进入掌握度估计。** 靠完整解答答对（bottom-out hint）按未掌握记，
否则「全对但全靠提示」的学生会被误判为已掌握，见 `test_answer_correctness_alone_is_insufficient`。

## 运行

```bash
pip install mediapipe opencv-python-headless pytest
# 无头环境另需: sudo apt-get install -y libegl1 libgles2 libgl1

# 下载模型（默认放在 /tmp/rehab，可用 POSE_MODEL_DIR 覆盖）
mkdir -p /tmp/rehab && cd /tmp/rehab
for m in lite full heavy; do
  curl -sSL -o pose_landmarker_$m.task \
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_$m/float16/latest/pose_landmarker_$m.task"
done

cd -/prototype

# 学径AI（无外部依赖，纯 Python）
python3 -m pytest test_learning_core.py -q
python3 test_learning_core.py

# 复途
python3 -m pytest test_rehab_core.py -q
python3 test_rehab_core.py
python3 bench_pose.py                     # 性能基准
python3 e2e_pose.py /path/to/person.jpg   # 端到端
```

`learning_core.py` 不依赖 mediapipe/opencv，只用标准库。

## 边界说明

两套都是**可行性原型**，不是参赛交付物。

**学径AI** 缺少：大模型接入（题目变式、提示文本、错因解释均需 LLM 生成）、知识点图谱的自动抽取、可执行判题沙箱、四个界面。BKT 参数为通用占位值，实际应按题库难度分知识点标注。

**复途** 缺少：关键点时序平滑（one-euro filter）、机位引导、真实大模型接入（当前以传入参数模拟其输出，以便测试夹紧逻辑）、治疗师端界面。代偿阈值为占位值，实际必须由持证康复治疗师按患者情况设定。
