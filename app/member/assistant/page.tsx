"use client";

import { useEffect, useState } from "react";
import { MainLayout } from "@/components/main-layout";
import { presetTexts, useI18n } from "@/lib/i18n";
import type { AssistantAttachmentKind, AssistantMode, AssistantResponse } from "@/lib/demo-types";

export default function AssistantPage() {
  const { t, locale } = useI18n();
  const presets = presetTexts[locale];

  const [mode, setMode] = useState<AssistantMode>("guidance");
  const [message, setMessage] = useState(presets.guidance[0]);
  const [response, setResponse] = useState<AssistantResponse | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const attachmentKind: AssistantAttachmentKind = "video";
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState("");

  useEffect(() => {
    setMessage(presets[mode][0]);
    setError("");
    if (mode !== "guidance") {
      setAttachmentFile(null);
    }
  }, [mode, locale]);

  useEffect(() => {
    if (!attachmentFile) {
      setAttachmentPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(attachmentFile);
    setAttachmentPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [attachmentFile]);

  async function submit() {
    setIsSubmitting(true);
    setError("");

    try {
      const apiResponse = await (attachmentFile && mode === "guidance"
        ? (() => {
            const formData = new FormData();
            formData.append("mode", mode);
            formData.append("message", message);
            formData.append("attachmentKind", attachmentKind);
            formData.append("attachment", attachmentFile);
            return fetch("/api/assistant", { method: "POST", body: formData });
          })()
        : fetch("/api/assistant", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode, message }),
          }));

      const json = (await apiResponse.json()) as { data?: AssistantResponse; error?: string };
      if (!apiResponse.ok || !json.data) {
        throw new Error(json.error ?? "Error");
      }
      setResponse(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setIsSubmitting(false);
    }
  }

  const modeKeys: AssistantMode[] = ["guidance", "plan", "review"];
  const modeLabelKey = (m: AssistantMode) =>
    (m === "plan" ? "mode_plan" : m === "guidance" ? "mode_guidance" : "mode_review") as
      | "mode_plan"
      | "mode_guidance"
      | "mode_review";

  return (
    <MainLayout>
      <h1 className="greeting">{t("greeting")}</h1>
      <p className="greeting-sub reveal" style={{ animationDelay: "60ms" }}>
        {t("greeting_sub")}
      </p>
      <div className="split">
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

          {mode === "guidance" && (
            <div className="upload">
              <label className="dropzone">
                <input
                  accept="video/mp4,video/quicktime,video/webm"
                  onChange={(event) => setAttachmentFile(event.target.files?.[0] ?? null)}
                  type="file"
                />
                <strong>{attachmentFile ? attachmentFile.name : t("pick_video")}</strong>
                <small>{t("video_hint")}</small>
              </label>

              {attachmentPreviewUrl && (
                <div className="upload-preview">
                  <video controls src={attachmentPreviewUrl} />
                  <button
                    className="btn btn-ghost btn-compact"
                    onClick={() => setAttachmentFile(null)}
                    type="button"
                  >
                    {t("remove_media")}
                  </button>
                </div>
              )}
            </div>
          )}

          {error && <div className="alert">{error}</div>}

          <div className="button-row">
            <button
              className="btn btn-primary"
              disabled={isSubmitting || !message.trim()}
              onClick={() => void submit()}
              type="button"
            >
              {isSubmitting ? t("generating") : t("generate")}
            </button>
          </div>
        </section>

        <section className="card reveal" style={{ animationDelay: "80ms" }}>
          {response ? <Result response={response} /> : <EmptyState />}
        </section>
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
  const badgeClass = response.usedFallback ? "badge badge-warn" : "badge badge-ok";
  const badgeLabel = response.usedFallback ? t("source_fallback") : response.providerLabel;

  return (
    <div className="reveal">
      <div className="result-summary">
        <h3>{response.title}</h3>
        <p>{response.summary}</p>
        <div className="result-meta">
          <span className={badgeClass}>{badgeLabel}</span>
        </div>
      </div>

      {response.highlights.length > 0 && <ResultList title={t("sec_highlights")} items={response.highlights} />}

      {response.trainingPlan.length > 0 && (
        <div className="result-section">
          <p className="result-section-title">{t("sec_plan")}</p>
          <div className="plan-table">
            {response.trainingPlan.map((day) => (
              <div className="plan-row" key={day.dayLabel}>
                <div className="plan-cell-title">
                  {day.dayLabel}
                  <small>{day.focus}</small>
                </div>
                <div className="plan-cell-muted">{day.duration}</div>
                <div className="plan-cell-muted">{day.intensity}</div>
                <div className="plan-cell-muted">{day.note}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {response.guidancePoints.length > 0 && <ResultList title={t("sec_guidance")} items={response.guidancePoints} />}
      {response.nutritionTips.length > 0 && <ResultList title={t("sec_nutrition")} items={response.nutritionTips} />}
      {response.reviewInsights.length > 0 && <ResultList title={t("sec_review")} items={response.reviewInsights} />}
      {response.recoveryActions.length > 0 && <ResultList title={t("sec_next")} items={response.recoveryActions} />}
      {response.safetyFlags.length > 0 && <ResultList title={t("sec_safety")} items={response.safetyFlags} warn />}
      {response.nextSteps.length > 0 && <ResultList title={t("sec_steps")} items={response.nextSteps} />}

      {response.citations.length > 0 && (
        <div className="result-section">
          <p className="result-section-title">{t("sec_cite")}</p>
          <div className="citations">
            {response.citations.map((citation) => (
              <article className="citation" key={`${citation.source}-${citation.title}`}>
                <strong>{citation.title}</strong>
                <p>{citation.note}</p>
                <span>{citation.source}</span>
              </article>
            ))}
          </div>
        </div>
      )}
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
