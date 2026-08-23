# prototype — 赛道三候选作品的核心算法原型

两套原型，共用一个设计原则：**确定性引擎独占关键决策，大模型只在边界内生成内容。**

## A. 《学径AI》学习路径引擎

方案评估见 [`docs/08-学径AI方案评估与改进.md`](../docs/08-学径AI方案评估与改进.md)。

| 文件 | 内容 |
| --- | --- |
| `learning_core.py` | BKT 掌握度估计、提示依赖度作为观测证据、保守间隔排期（按证据量限幅）、学生端档位、前置门控、连续答错回退、班级共性问题汇总 |
| `test_learning_core.py` | 31 个单元测试；直接运行可打印六段验证报告 |

关键结论（实测）：两名学生**三题全对、唯一差别是提示依赖**，掌握度估计 98.4% vs 64.2%，
复习间隔 7.0 天 vs 1.5 天，学生端档位「稳定掌握」vs「需巩固」。**答对，不等于独立答对。**

### 表述边界（重要）

- 这些数字是**占位参数下的引擎估计值**，不是学生真实掌握概率，也不是经验证的最佳复习时机。
- 单元测试验证的是**引擎规则、边界条件与决策逻辑按设计稳定运行**，不证明学习效果。
- 遗忘曲线用的是 FSRS 的幂律形式 R(t) = (1 + t/9S)^−1，**但稳定度更新是本项目自定义的
  保守规则，不是 FSRS 算法**，不得对外称「采用 FSRS」。
- 不用 DKT（需大规模训练数据），不提艾宾浩斯曲线（其材料是无意义音节，「1/2/4/7 天」是民间口诀）。

### 关于复习间隔限幅

最初实现让稳定度无上限连乘，三次独立答对就排到 29.1 天后复习——那是自定增长系数连乘的
结果，对刚学的知识点过于激进。现改为**按证据量限幅**：独立成功 1/2/3/4 次时上限
1/3/7/15 天，超过 4 次放开。依据是不确定性（观测太少不外推），不是固定复习表——
依赖提示的学生增长慢、根本触不到上限，失败则回落。

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
