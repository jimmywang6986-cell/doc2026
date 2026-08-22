# prototype — 《复途》康复智能体核心算法原型

用于验证 `docs/06` 方案的技术可行性、回答「实现难不难、手机要求高不高」。
评估结论见 [`docs/07-赛道三技术可行性与手机要求.md`](../docs/07-赛道三技术可行性与手机要求.md)。

## 文件

| 文件 | 内容 |
| --- | --- |
| `rehab_core.py` | 核心算法：关节角度解算、代偿检测、带迟滞的计数状态机、确定性安全闸门、模型输出夹紧 |
| `test_rehab_core.py` | 19 个单元测试；直接运行可打印逐项验证报告 |
| `e2e_pose.py` | 端到端：真实图像 → MediaPipe 关键点 → 临床角度 → 代偿判定 → 决策 → 标注图 |
| `bench_pose.py` | 三档姿态模型的体积与单帧推理延迟基准 |

## 设计要点

**安全判定不交给大模型。** `safety_gate()` 是纯规则引擎，疼痛超阈、活动度骤降、连续未训练任一命中即升级，无模型参与、理由逐条可追溯。大模型只在闸门放行后决定「练多少、怎么说」，且数值输出被 `clamp_llm_output()` 夹紧到治疗师设定的处方边界内。闸门升级时模型输出直接丢弃。

**计数必须带迟滞。** 单阈值计数在关键点抖动 ±14° 时会把 6 次动作数成 12 次。双阈值迟滞加保持帧数要求可消除该问题，见 `test_hysteresis_beats_naive_under_jitter`。

**角度用归一化坐标解算**，结果与摄像头分辨率无关。

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
python3 -m pytest test_rehab_core.py -q   # 单元测试
python3 test_rehab_core.py                # 可读验证报告
python3 bench_pose.py                     # 性能基准
python3 e2e_pose.py /path/to/person.jpg   # 端到端
```

## 边界说明

这是**可行性原型**，不是参赛交付物。缺少：关键点时序平滑（one-euro filter）、机位引导、真实大模型接入（当前以传入参数模拟其输出，以便测试夹紧逻辑）、治疗师端界面。代偿阈值为占位值，实际必须由持证康复治疗师按患者情况设定。
