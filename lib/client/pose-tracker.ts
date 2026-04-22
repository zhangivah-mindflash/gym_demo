"use client";

import type {
  NormalizedLandmark,
  PoseLandmarker as PoseLandmarkerType,
} from "@mediapipe/tasks-vision";

export type PoseLandmark = NormalizedLandmark;

export type PoseMetrics = {
  kneeAngle: number;
  hipAngle: number;
  shoulderAngle: number;
  hipX: number;
  hipY: number;
  kneeX: number;
  kneeY: number;
  ankleX: number;
  ankleY: number;
  shoulderY: number;
  state: "standing" | "descending" | "parallel" | "deep";
};

export type PoseFrame = {
  landmarks: PoseLandmark[];
  metrics: PoseMetrics | null;
  timestamp: number;
};

// MediaPipe BlazePose 33-point layout
export const LANDMARK = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
} as const;

// BlazePose 33 点 — 仅躯干与四肢，不包含面部（0~10），避免脸上出现碎点碎线
export const POSE_CONNECTIONS: Array<[number, number]> = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],
  [27, 29],
  [29, 31],
  [28, 30],
  [30, 32],
  [15, 17],
  [15, 19],
  [15, 21],
  [17, 19],
  [16, 18],
  [16, 20],
  [16, 22],
  [18, 20],
];

// CDN URLs — no local bundling required, browser caches them after first load.
const WASM_PATH =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm";
const MODEL_PATH =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task";

let landmarkerPromise: Promise<PoseLandmarkerType> | null = null;

async function getLandmarker(): Promise<PoseLandmarkerType> {
  if (landmarkerPromise) return landmarkerPromise;
  landmarkerPromise = (async () => {
    const { FilesetResolver, PoseLandmarker } = await import(
      "@mediapipe/tasks-vision"
    );
    const vision = await FilesetResolver.forVisionTasks(WASM_PATH);
    try {
      return await PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_PATH, delegate: "GPU" },
        runningMode: "VIDEO",
        numPoses: 1,
      });
    } catch (err) {
      console.warn("[pose] GPU delegate failed, falling back to CPU", err);
      return await PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_PATH, delegate: "CPU" },
        runningMode: "VIDEO",
        numPoses: 1,
      });
    }
  })();
  return landmarkerPromise;
}

export async function preloadPoseModel() {
  try {
    await getLandmarker();
    return true;
  } catch (err) {
    console.error("[pose] preload failed", err);
    return false;
  }
}

export class PoseTracker {
  private video: HTMLVideoElement | null = null;
  private onFrame: ((frame: PoseFrame) => void) | null = null;
  private rafId = 0;
  private running = false;
  private lastProcessTs = 0;
  private lastVideoTs = -1;
  private landmarker: PoseLandmarkerType | null = null;

  async start(video: HTMLVideoElement, onFrame: (frame: PoseFrame) => void) {
    this.video = video;
    this.onFrame = onFrame;
    this.running = true;
    try {
      this.landmarker = await getLandmarker();
    } catch (err) {
      console.error("[pose] failed to load model", err);
      this.running = false;
      throw err;
    }
    if (!this.running) return;
    this.loop();
  }

  stop() {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    this.video = null;
    this.onFrame = null;
  }

  private loop = () => {
    if (!this.running || !this.video || !this.onFrame || !this.landmarker) return;
    const video = this.video;
    const ts = performance.now();

    // Throttle to ~24fps to save CPU on laptops; pose motion doesn't need 60fps.
    // Also skip if video hasn't advanced since last process (paused etc.).
    const videoTs = video.currentTime;
    const advanced = videoTs !== this.lastVideoTs;
    if (
      video.readyState >= 2 &&
      ts - this.lastProcessTs >= 40 &&
      advanced
    ) {
      this.lastProcessTs = ts;
      this.lastVideoTs = videoTs;
      try {
        const result = this.landmarker.detectForVideo(video, ts);
        const landmarks = result.landmarks?.[0] ?? [];
        const metrics = computePoseMetrics(landmarks);
        this.onFrame({ landmarks, metrics, timestamp: ts });
      } catch (err) {
        console.warn("[pose] detect error", err);
      }
    }

    this.rafId = requestAnimationFrame(this.loop);
  };
}

function angleBetween(
  a: PoseLandmark,
  b: PoseLandmark,
  c: PoseLandmark,
): number {
  const abx = a.x - b.x;
  const aby = a.y - b.y;
  const cbx = c.x - b.x;
  const cby = c.y - b.y;
  const dot = abx * cbx + aby * cby;
  const magAb = Math.hypot(abx, aby);
  const magCb = Math.hypot(cbx, cby);
  if (magAb === 0 || magCb === 0) return NaN;
  const cos = Math.max(-1, Math.min(1, dot / (magAb * magCb)));
  return (Math.acos(cos) * 180) / Math.PI;
}

export function computePoseMetrics(landmarks: PoseLandmark[]): PoseMetrics | null {
  if (!landmarks || landmarks.length < 33) return null;

  const lh = landmarks[LANDMARK.LEFT_HIP];
  const rh = landmarks[LANDMARK.RIGHT_HIP];
  const lk = landmarks[LANDMARK.LEFT_KNEE];
  const rk = landmarks[LANDMARK.RIGHT_KNEE];
  const la = landmarks[LANDMARK.LEFT_ANKLE];
  const ra = landmarks[LANDMARK.RIGHT_ANKLE];
  const ls = landmarks[LANDMARK.LEFT_SHOULDER];
  const rs = landmarks[LANDMARK.RIGHT_SHOULDER];

  if (!lh || !rh || !lk || !rk || !la || !ra) return null;

  const vis = (p: PoseLandmark) => p.visibility ?? 0;

  // Use the better-visible side so side-on shots (one leg mostly occluded) still work.
  const leftLegVis = Math.min(vis(lh), vis(lk), vis(la));
  const rightLegVis = Math.min(vis(rh), vis(rk), vis(ra));
  const VIS_MIN = 0.25;

  if (leftLegVis < VIS_MIN && rightLegVis < VIS_MIN) return null;

  const leftKnee = leftLegVis >= VIS_MIN ? angleBetween(lh, lk, la) : NaN;
  const rightKnee = rightLegVis >= VIS_MIN ? angleBetween(rh, rk, ra) : NaN;

  let kneeAngle: number;
  if (Number.isFinite(leftKnee) && Number.isFinite(rightKnee)) {
    kneeAngle = (leftKnee + rightKnee) / 2;
  } else if (Number.isFinite(leftKnee)) {
    kneeAngle = leftKnee;
  } else {
    kneeAngle = rightKnee;
  }

  const hipX = (lh.x + rh.x) / 2;
  const hipY = (lh.y + rh.y) / 2;
  const kneeX = (lk.x + rk.x) / 2;
  const kneeY = (lk.y + rk.y) / 2;
  const ankleX = (la.x + ra.x) / 2;
  const ankleY = (la.y + ra.y) / 2;

  // Hip angle = trunk lean: angle between shoulder-midpoint → hip-midpoint vector and vertical.
  // Standing upright ≈ 0°, deeper forward lean → larger number.
  let hipAngle = NaN;
  let shoulderY =
    ls && rs && Number.isFinite(ls.y) && Number.isFinite(rs.y)
      ? (ls.y + rs.y) / 2
      : NaN;
  let shoulderAngle = NaN;
  if (ls && rs) {
    const shoulderVis = Math.min(vis(ls), vis(rs));
    if (shoulderVis >= VIS_MIN) {
      const sMidX = (ls.x + rs.x) / 2;
      const sMidY = (ls.y + rs.y) / 2;
      shoulderY = sMidY;
      const dx = hipX - sMidX;
      const dy = hipY - sMidY;
      if (dy > 0) {
        hipAngle = Math.abs((Math.atan2(dx, dy) * 180) / Math.PI);
      }
      // Shoulder tilt: left→right shoulder vector relative to horizontal (0 = level).
      const sdx = rs.x - ls.x;
      const sdy = rs.y - ls.y;
      shoulderAngle = Math.abs((Math.atan2(sdy, sdx) * 180) / Math.PI);
    }
  }

  let state: PoseMetrics["state"];
  if (kneeAngle >= 160) state = "standing";
  else if (kneeAngle >= 110) state = "descending";
  else if (kneeAngle >= 80) state = "parallel";
  else state = "deep";

  return {
    kneeAngle,
    hipAngle,
    shoulderAngle,
    hipX,
    hipY,
    kneeX,
    kneeY,
    ankleX,
    ankleY,
    shoulderY,
    state,
  };
}
