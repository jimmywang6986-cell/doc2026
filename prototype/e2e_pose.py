"""端到端验证: 真实图像 → MediaPipe 关键点 → 临床角度 → 代偿判定 → 决策。

用法:
    python3 prototype/e2e_pose.py <图片路径> [模型路径]

输出一张标注图, 用于确认整条链路在真实图像上成立。
"""

from __future__ import annotations

import sys

import cv2
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision

from rehab_core import (
    Envelope,
    SessionSignals,
    decide,
    knee_extension,
    shoulder_abduction,
    shrug_deg,
    trunk_lean_deg,
)

# 与骨架连线, 仅画躯干与四肢主干
EDGES = [
    (11, 12), (11, 23), (12, 24), (23, 24),
    (11, 13), (13, 15), (12, 14), (14, 16),
    (23, 25), (25, 27), (24, 26), (26, 28),
]

ENV = Envelope(
    reps_min=10, reps_target=15, reps_max=20,
    rom_floor=45, rom_target=70, rom_ceiling=90,
    shrug_tolerance_deg=12, trunk_lean_tolerance_deg=10,
    stop_pain_nrs=4, escalate_pain_nrs=6,
    escalate_quality_drop_pct=30, escalate_no_activity_days=3,
)


def main(img_path: str, model_path: str) -> int:
    bgr = cv2.imread(img_path)
    if bgr is None:
        print(f"读不到图片: {img_path}")
        return 1
    h, w = bgr.shape[:2]
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)

    opts = vision.PoseLandmarkerOptions(
        base_options=mp_python.BaseOptions(model_asset_path=model_path),
        running_mode=vision.RunningMode.IMAGE,
        num_poses=1,
    )
    with vision.PoseLandmarker.create_from_options(opts) as lm:
        res = lm.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb))

    if not res.pose_landmarks:
        print("未检出人体")
        return 1

    raw = res.pose_landmarks[0]
    pts = [(p.x, p.y) for p in raw]  # 归一化坐标, 角度解算与分辨率无关
    px = [(int(p.x * w), int(p.y * h)) for p in raw]

    metrics = {
        "左肩外展角": shoulder_abduction(pts, "L"),
        "右肩外展角": shoulder_abduction(pts, "R"),
        "左膝角": knee_extension(pts, "L"),
        "右膝角": knee_extension(pts, "R"),
        "耸肩倾角": shrug_deg(pts),
        "躯干侧倾": trunk_lean_deg(pts),
    }

    print(f"图像 {w}x{h}   检出关键点 {len(raw)} 个\n")
    for k, v in metrics.items():
        print(f"  {k:<8} {v:>7.1f}°")

    shrug = metrics["耸肩倾角"]
    lean = metrics["躯干侧倾"]
    print(f"\n  代偿判定  耸肩 {shrug:.1f}° / 容差 {ENV.shrug_tolerance_deg}° "
          f"→ {'告警' if shrug > ENV.shrug_tolerance_deg else '正常'}")
    print(f"           侧倾 {lean:.1f}° / 容差 {ENV.trunk_lean_tolerance_deg}° "
          f"→ {'告警' if lean > ENV.trunk_lean_tolerance_deg else '正常'}")

    gate, presc = decide(
        ENV,
        SessionSignals(
            pain_nrs=2,
            mean_peak_rom=metrics["左肩外展角"],
            baseline_rom=70.0,
            compensation_rate=0.15,
            completed_reps=12,
            days_since_last_session=1,
        ),
        llm_reps=16, llm_rom=75, llm_line="胳膊慢慢往上抬，肩膀放松，我数着",
    )
    print(f"\n  安全闸门  {gate.verdict.value}  ({gate.reasons[0]})")
    if presc:
        print(f"  下发方案  {presc.reps} 次 / 目标 {presc.rom_target:.0f}°")
        print(f"  语音指导  「{presc.coaching_line}」")

    # 标注图
    out = bgr.copy()
    for a, b in EDGES:
        cv2.line(out, px[a], px[b], (0, 220, 120), 3)
    for i in (11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28):
        cv2.circle(out, px[i], 6, (0, 90, 255), -1)
    lines = [
        f"L shoulder abduction : {metrics['左肩外展角']:6.1f} deg",
        f"R shoulder abduction : {metrics['右肩外展角']:6.1f} deg",
        f"L knee / R knee      : {metrics['左膝角']:6.1f} / {metrics['右膝角']:.1f} deg",
        f"shrug                : {shrug:6.1f} deg  (tol {ENV.shrug_tolerance_deg})",
        f"trunk lean           : {lean:6.1f} deg  (tol {ENV.trunk_lean_tolerance_deg})",
        f"safety gate          : {gate.verdict.value.upper()}",
    ]
    pad, lh = 14, 30
    panel_h = pad * 2 + lh * len(lines)
    panel_w = 470
    overlay = out.copy()
    cv2.rectangle(overlay, (0, 0), (panel_w, panel_h), (20, 20, 20), -1)
    cv2.addWeighted(overlay, 0.72, out, 0.28, 0, out)
    for i, t in enumerate(lines):
        cv2.putText(
            out, t, (pad, pad + lh * i + 21),
            cv2.FONT_HERSHEY_DUPLEX, 0.55, (255, 255, 255), 1, cv2.LINE_AA,
        )

    dst = "/tmp/rehab/e2e_annotated.jpg"
    cv2.imwrite(dst, out)
    print(f"\n  标注图已写出: {dst}")
    return 0


if __name__ == "__main__":
    img = sys.argv[1] if len(sys.argv) > 1 else "/tmp/rehab/pose.jpg"
    model = sys.argv[2] if len(sys.argv) > 2 else "/tmp/rehab/pose_landmarker_lite.task"
    sys.exit(main(img, model))
