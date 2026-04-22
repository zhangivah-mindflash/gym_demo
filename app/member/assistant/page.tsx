"use client";

import { useEffect, useRef, useState } from "react";
import { MainLayout } from "@/components/main-layout";
import { presetTexts, useI18n } from "@/lib/i18n";
import type { AssistantMode, AssistantResponse } from "@/lib/demo-types";
import {
  POSE_CONNECTIONS,
  PoseTracker,
  preloadPoseModel,
  type PoseFrame,
} from "@/lib/client/pose-tracker";

export default function AssistantPage() {
  const { t, locale } = useI18n();
  const presets = presetTexts[locale];

  const [mode, setMode] = useState<AssistantMode>("guidance");
  const [message, setMessage] = useState(presets.guidance[0]);
  const [responses, setResponses] = useState<Partial<Record<AssistantMode, AssistantResponse>>>({});
  const response = responses[mode] ?? null;
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState("");
  const [scanProgress, setScanProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const trackerRef = useRef<PoseTracker | null>(null);
  const [poseFrame, setPoseFrame] = useState<PoseFrame | null>(null);
  const [poseModelReady, setPoseModelReady] = useState(false);
  const [videoAspect, setVideoAspect] = useState<number | null>(null);
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    setMessage(mode === "guidance" ? "" : presets[mode][0]);
    setError("");
    if (mode !== "guidance") {
      setAttachmentFile(null);
    }
  }, [mode, locale]);

  useEffect(() => {
    if (mode !== "guidance") setIsTracking(false);
  }, [mode]);

  useEffect(() => {
    if (!attachmentFile) {
      setAttachmentPreviewUrl("");
      setVideoAspect(null);
      return;
    }
    const url = URL.createObjectURL(attachmentFile);
    setAttachmentPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [attachmentFile]);

  useEffect(() => {
    let cancelled = false;
    preloadPoseModel().then((ok) => {
      if (!cancelled) setPoseModelReady(ok);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!isTracking) {
      video.loop = false;
      if (trackerRef.current) {
        trackerRef.current.stop();
        trackerRef.current = null;
      }
      setPoseFrame(null);
      return;
    }

    let rafId = 0;
    const update = () => {
      const duration = video.duration;
      if (Number.isFinite(duration) && duration > 0) {
        const ratio = Math.min(video.currentTime / duration, 1);
        setScanProgress((prev) => (ratio > prev ? ratio : prev));
      }
      rafId = requestAnimationFrame(update);
    };

    video.muted = true;
    video.loop = true;
    video.currentTime = 0;
    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => undefined);
    }
    rafId = requestAnimationFrame(update);

    const tracker = new PoseTracker();
    trackerRef.current = tracker;
    tracker.start(video, (frame) => setPoseFrame(frame)).catch((err) => {
      console.warn("[pose] tracker start failed", err);
    });

    return () => {
      cancelAnimationFrame(rafId);
      video.loop = false;
      try {
        video.pause();
      } catch {
        // ignore
      }
      tracker.stop();
      if (trackerRef.current === tracker) trackerRef.current = null;
      setPoseFrame(null);
    };
  }, [isTracking]);

  function startTracking() {
    setScanProgress(0);
    setError("");
    setIsTracking(true);
  }

  function stopTracking() {
    setIsTracking(false);
  }

  async function submitPlan() {
    setIsSubmitting(true);
    setError("");
    try {
      const apiResponse = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, message }),
      });
      const json = (await apiResponse.json()) as { data?: AssistantResponse; error?: string };
      if (!apiResponse.ok || !json.data) throw new Error(json.error ?? "Error");
      setResponses((prev) => ({ ...prev, [mode]: json.data! }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    }
    setIsSubmitting(false);
  }

  const modeKeys: AssistantMode[] = ["guidance", "plan"];
  const modeLabelKey = (m: AssistantMode) =>
    (m === "plan" ? "mode_plan" : "mode_guidance") as "mode_plan" | "mode_guidance";

  return (
    <MainLayout>
      <div className="assistant-dark">
      <section className="assistant-hero reveal">
        <div className="assistant-hero-copy">
          <p className="assistant-hero-eyebrow">AI MOTION TRACKING</p>
          <h1 className="assistant-hero-title">{t("greeting")}</h1>
          <p className="assistant-hero-sub">{t("greeting_sub")}</p>
        </div>
        <div className="assistant-hero-badge" aria-hidden>
          <span className="assistant-hero-badge-dot" />
          <span className="assistant-hero-badge-text">LIVE POSE</span>
        </div>
      </section>
      <div className={`split${mode === "guidance" ? " split-single" : ""}`}>
        <section className="card reveal">
          <div className="segmented">
            {modeKeys.map((key) => (
              <button
                className={key === mode ? "segment segment-active" : "segment"}
                key={key}
                onClick={() => setMode(key)}
                type="button"
              >
                {t(modeLabelKey(key))}
              </button>
            ))}
          </div>

          {mode !== "guidance" && (
            <>
              <div className="chips" style={{ marginTop: 16 }}>
                {presets[mode].map((preset) => (
                  <button className="chip" key={preset} onClick={() => setMessage(preset)} type="button">
                    {preset}
                  </button>
                ))}
              </div>

              <label className="field">
                <textarea
                  rows={5}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder={t("placeholder")}
                />
              </label>
            </>
          )}

          {mode === "guidance" && (
            <div className="upload">
              <label className="dropzone">
                <input
                  accept="video/mp4,video/quicktime,video/webm"
                  onChange={(event) => setAttachmentFile(event.target.files?.[0] ?? null)}
                  type="file"
                />
                <strong>{attachmentFile ? t("replace_video") : t("pick_video")}</strong>
                <small>{t("video_hint")}</small>
              </label>

              {attachmentPreviewUrl && (
                <div className="upload-preview">
                  <div
                    className={`upload-preview-frame${isTracking ? " is-scanning" : ""}`}
                    style={videoAspect ? { aspectRatio: videoAspect } : undefined}
                  >
                    <video
                      ref={videoRef}
                      controls={!isTracking}
                      src={attachmentPreviewUrl}
                      playsInline
                      muted={isTracking}
                      onLoadedMetadata={(event) => {
                        const el = event.currentTarget;
                        if (el.videoWidth > 0 && el.videoHeight > 0) {
                          setVideoAspect(el.videoWidth / el.videoHeight);
                        }
                      }}
                    />
                    {isTracking && (
                      <PoseScanOverlay
                        progress={scanProgress}
                        poseFrame={poseFrame}
                        modelReady={poseModelReady}
                      />
                    )}
                  </div>
                  <button
                    className="btn btn-ghost btn-compact"
                    onClick={() => setAttachmentFile(null)}
                    type="button"
                    disabled={isTracking}
                  >
                    {t("remove_media")}
                  </button>
                </div>
              )}
            </div>
          )}

          {error && <div className="alert">{error}</div>}

          <div className="button-row">
            {mode === "guidance" ? (
              <button
                className={`btn ${isTracking ? "btn-ghost" : "btn-primary"}`}
                disabled={!attachmentFile}
                onClick={() => (isTracking ? stopTracking() : startTracking())}
                type="button"
              >
                {isTracking ? t("track_stop") : t("track_start")}
              </button>
            ) : (
              <button
                className="btn btn-primary"
                disabled={isSubmitting || !message.trim()}
                onClick={() => void submitPlan()}
                type="button"
              >
                {isSubmitting ? t("generating") : t("generate")}
              </button>
            )}
          </div>
        </section>

        {mode !== "guidance" && (
          <section className="card reveal" style={{ animationDelay: "80ms" }}>
            {response ? <Result response={response} /> : <EmptyState />}
          </section>
        )}
      </div>
      </div>
    </MainLayout>
  );
}

function EmptyState() {
  const { t } = useI18n();
  return (
    <div className="empty">
      <span className="empty-icon" aria-hidden />
      {t("empty")}
    </div>
  );
}


function Result({ response }: { response: AssistantResponse }) {
  const { t } = useI18n();

  return (
    <div className="reveal">
      {response.mode === "plan" && (
        <>
          {response.trainingPlan.length > 0 && (
            <div className="result-section">
              <p className="result-section-title">{t("sec_plan")}</p>
              <div className="day-list">
                {response.trainingPlan.map((day) => (
                  <article className="day-card" key={day.dayLabel}>
                    <header className="day-card-head">
                      <span className="day-card-label">{day.dayLabel}</span>
                      <div className="day-card-tags">
                        {day.duration && <span className="tag">{day.duration}</span>}
                        {day.intensity && <span className="tag">{day.intensity}</span>}
                      </div>
                    </header>
                    {day.focus && <p className="day-card-focus">{day.focus}</p>}
                    {day.note && <p className="day-card-note">{day.note}</p>}
                  </article>
                ))}
              </div>
            </div>
          )}
          {response.nutritionTips.length > 0 && (
            <ResultList title={t("sec_nutrition")} items={response.nutritionTips} />
          )}
        </>
      )}

      {response.mode === "guidance" && response.guidancePoints.length > 0 && (
        <div className="result-section">
          <p className="result-section-title">{t("sec_guidance")}</p>
          <ol className="point-list">
            {response.guidancePoints.map((item, idx) => (
              <li className="point-card" key={item}>
                <span className="point-index">{idx + 1}</span>
                <p className="point-text">{item}</p>
              </li>
            ))}
          </ol>
        </div>
      )}

      {response.safetyFlags.length > 0 && (
        <ResultList title={t("sec_safety")} items={response.safetyFlags} warn />
      )}
    </div>
  );
}

type BiomechState = "idle" | "holding" | "success";

function PoseScanOverlay({
  progress,
  poseFrame,
  modelReady,
}: {
  progress: number;
  poseFrame: PoseFrame | null;
  modelReady: boolean;
}) {
  const { t } = useI18n();
  const clamped = Math.max(0, Math.min(1, progress));
  const percent = Math.round(clamped * 100);

  const landmarks = poseFrame?.landmarks ?? [];
  const metrics = poseFrame?.metrics ?? null;
  const hasPose = landmarks.length >= 33 && metrics !== null;

  const baselineY =
    metrics && Number.isFinite(metrics.hipY)
      ? Math.max(0.05, Math.min(0.95, metrics.hipY)) * 100
      : 58;

  const biomech: BiomechState = !metrics
    ? "idle"
    : metrics.state === "parallel" || metrics.state === "deep"
      ? "success"
      : metrics.state === "descending"
        ? "holding"
        : "idle";
  const biomechVisible = biomech !== "idle";

  return (
    <div
      className="pose-scan"
      aria-hidden
      style={{ ["--scan-pos" as string]: `${percent}%` }}
    >
      <span className="pose-scan-bracket pose-scan-bracket-tl" />
      <span className="pose-scan-bracket pose-scan-bracket-tr" />
      <span className="pose-scan-bracket pose-scan-bracket-bl" />
      <span className="pose-scan-bracket pose-scan-bracket-br" />

      <div className="pose-scan-line" />
      <div className="pose-scan-trail" />

      {hasPose && <PoseSkeleton landmarks={landmarks} />}

      {metrics && Number.isFinite(metrics.shoulderY) && (
        <BiomechBaseline
          yPercent={Math.max(5, Math.min(95, metrics.shoulderY * 100))}
          visible={biomechVisible}
          state={biomech}
          label="SHOULDER LINE"
          value={metrics.shoulderAngle}
          unit="SHOULDER TILT"
        />
      )}

      {metrics && (
        <BiomechBaseline
          yPercent={baselineY}
          visible={biomechVisible}
          state={biomech}
          label="HIP LINE"
          value={metrics.hipAngle}
          unit="TRUNK LEAN"
        />
      )}

      {metrics && (
        <BiomechBaseline
          yPercent={Math.max(5, Math.min(95, metrics.kneeY * 100))}
          visible={biomechVisible}
          state={biomech}
          label="KNEE LINE"
          value={metrics.kneeAngle}
          unit="KNEE FLEX"
        />
      )}

      <div className="pose-scan-bar">
        <div className="pose-scan-bar-fill" style={{ width: `${percent}%` }} />
      </div>

      <div className="pose-scan-status">
        <span className="pose-scan-status-dot" />
        <span>
          {!modelReady
            ? t("pose_loading")
            : hasPose
              ? t("pose_tracking")
              : t("scan_status")}
        </span>
        <span className="pose-scan-status-percent">{percent}%</span>
      </div>
    </div>
  );
}

const VIS_THRESH_LINE = 0.22;
const VIS_THRESH_DOT = 0.22;

function PoseSkeleton({ landmarks }: { landmarks: PoseFrame["landmarks"] }) {
  return (
    <svg
      className="pose-skeleton"
      viewBox="0 0 1 1"
      preserveAspectRatio="none"
      aria-hidden
    >
      <g className="pose-skeleton-bones">
        {POSE_CONNECTIONS.map(([a, b]) => {
          const la = landmarks[a];
          const lb = landmarks[b];
          if (!la || !lb) return null;
          const visA = (la.visibility ?? 1) >= VIS_THRESH_LINE;
          const visB = (lb.visibility ?? 1) >= VIS_THRESH_LINE;
          if (!visA || !visB) return null;
          return (
            <line
              key={`${a}-${b}`}
              x1={la.x}
              y1={la.y}
              x2={lb.x}
              y2={lb.y}
              className="pose-skeleton-bone"
            />
          );
        })}
      </g>
      <g className="pose-skeleton-joints">
        {landmarks.map((lm, idx) => {
          if (!lm) return null;
          if ((lm.visibility ?? 1) < VIS_THRESH_DOT) return null;
          if (idx <= 10) return null;
          const isMajor =
            idx === 11 ||
            idx === 12 ||
            idx === 13 ||
            idx === 14 ||
            idx === 15 ||
            idx === 16 ||
            idx >= 23;
          const r = isMajor ? 0.007 : 0.004;
          return (
            <circle
              key={idx}
              cx={lm.x}
              cy={lm.y}
              r={r}
              className={`pose-skeleton-dot${isMajor ? " pose-skeleton-dot-joint" : ""}`}
            />
          );
        })}
      </g>
    </svg>
  );
}

function BiomechBaseline({
  yPercent,
  visible,
  state,
  label,
  value,
  unit,
}: {
  yPercent: number;
  visible: boolean;
  state: BiomechState;
  label: string;
  value: number;
  unit: string;
}) {
  const display = Number.isFinite(value) ? `${Math.round(value)}°` : "—";
  return (
    <div
      className={`biomech-layer biomech-state-${state}${visible ? " is-visible" : ""}`}
      style={{ ["--biomech-y" as string]: `${yPercent}%` }}
    >
      <div className="biomech-baseline">
        <div className="biomech-baseline-line" />
        <div className="biomech-baseline-label" title={label}>
          <span className="biomech-baseline-angle">{display}</span>
          <span className="biomech-baseline-unit">{unit}</span>
        </div>
      </div>
    </div>
  );
}

function ResultList({ title, items, warn }: { title: string; items: string[]; warn?: boolean }) {
  return (
    <div className="result-section">
      <p className="result-section-title">{title}</p>
      <ul className={warn ? "result-list list-warn" : "result-list"}>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
