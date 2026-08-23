"""Benchmark MediaPipe Pose Landmarker: 模型体积 / 检出 / 单帧延迟。

目的是回答两个问题:
  1. 三档模型分别多大, 能不能装进一个普通 APK
  2. 单帧推理成本量级, 用于推断中低端手机能否跑得动康复训练所需的帧率
"""
import os
import statistics
import time

import cv2
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision

IMG = os.environ.get("POSE_IMG", "/tmp/rehab/pose.jpg")
MODEL_DIR = os.environ.get("POSE_MODEL_DIR", "/tmp/rehab")
MODELS = {
    "lite": os.path.join(MODEL_DIR, "pose_landmarker_lite.task"),
    "full": os.path.join(MODEL_DIR, "pose_landmarker_full.task"),
    "heavy": os.path.join(MODEL_DIR, "pose_landmarker_heavy.task"),
}
WARMUP, ITERS = 5, 40


def bench(name, path):
    size_mb = os.path.getsize(path) / 1e6
    opts = vision.PoseLandmarkerOptions(
        base_options=mp_python.BaseOptions(model_asset_path=path),
        running_mode=vision.RunningMode.IMAGE,
        num_poses=1,
    )
    bgr = cv2.imread(IMG)
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)

    with vision.PoseLandmarker.create_from_options(opts) as lm:
        res = lm.detect(mp_img)
        found = len(res.pose_landmarks)
        for _ in range(WARMUP):
            lm.detect(mp_img)
        lat = []
        for _ in range(ITERS):
            t0 = time.perf_counter()
            lm.detect(mp_img)
            lat.append((time.perf_counter() - t0) * 1000)

    return {
        "model": name,
        "size_mb": size_mb,
        "detected": found,
        "landmarks": len(res.pose_landmarks[0]) if found else 0,
        "p50_ms": statistics.median(lat),
        "p90_ms": sorted(lat)[int(0.9 * len(lat))],
        "fps_p50": 1000 / statistics.median(lat),
    }


if __name__ == "__main__":
    h, w = cv2.imread(IMG).shape[:2]
    print(f"测试图: {IMG}  {w}x{h}")
    print(f"CPU 逻辑核: {os.cpu_count()}\n")
    print(f"{'模型':<8}{'体积MB':>9}{'检出':>6}{'关键点':>7}{'p50 ms':>10}{'p90 ms':>10}{'FPS':>8}")
    print("-" * 60)
    for n, p in MODELS.items():
        r = bench(n, p)
        print(
            f"{r['model']:<8}{r['size_mb']:>9.1f}{r['detected']:>6}{r['landmarks']:>7}"
            f"{r['p50_ms']:>10.1f}{r['p90_ms']:>10.1f}{r['fps_p50']:>8.1f}"
        )
