"use client";

import { useEffect, useState } from "react";
import { MainLayout } from "@/components/main-layout";
import { initialDemoState } from "@/lib/mock-data";
import type { AssistantAttachmentKind, AssistantMode, AssistantResponse } from "@/lib/demo-types";

const memberProfile = initialDemoState.memberProfile;

const presets: Record<AssistantMode, string[]> = {
  plan: [
    "结合我当前目标和膝盖情况，生成一周训练计划和简化饮食建议。",
    "我最近工作比较忙，请帮我把计划做得更容易坚持。",
  ],
  guidance: [
    "我今天要做罗马尼亚硬拉，请给我动作要点、热身、休息和风险提醒。",
    "训练中出现下背不适，我应该怎么处理？",
  ],
  review: [
    "本周完成 3 次训练，略疲劳，请帮我复盘并给出下周调整建议。",
    "请根据最近训练和体重变化，告诉我下周该怎么调。",
  ],
};

const modeLabels: Record<AssistantMode, string> = {
  plan: "训练计划",
  guidance: "动作指导",
  review: "复盘调整",
};

export default function AssistantPage() {
  const [mode, setMode] = useState<AssistantMode>("plan");
  const [message, setMessage] = useState(presets.plan[0]);
  const [response, setResponse] = useState<AssistantResponse | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachmentKind, setAttachmentKind] = useState<AssistantAttachmentKind>("image");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState("");

  useEffect(() => {
    setMessage(presets[mode][0]);
    setError("");
    if (mode !== "guidance") {
      setAttachmentFile(null);
    }
  }, [mode]);

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
        throw new Error(json.error ?? "助理请求失败");
      }
      setResponse(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "助理请求失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <MainLayout>
      <div className="split">
        {/* LEFT: input */}
        <section className="card reveal">
          <header className="card-header">
            <div>
              <h2>提问</h2>
              <p>
                {memberProfile.memberName} · {memberProfile.goalLabel}
              </p>
            </div>
          </header>

          <p className="card-section-title">场景</p>
          <div className="segmented">
            {(Object.keys(modeLabels) as AssistantMode[]).map((key) => (
              <button
                className={key === mode ? "segment segment-active" : "segment"}
                key={key}
                onClick={() => setMode(key)}
                type="button"
              >
                {modeLabels[key]}
              </button>
            ))}
          </div>

          <p className="card-section-title" style={{ marginTop: 18 }}>
            常用提问
          </p>
          <div className="chips">
            {presets[mode].map((preset) => (
              <button className="chip" key={preset} onClick={() => setMessage(preset)} type="button">
                {preset}
              </button>
            ))}
          </div>

          <label className="field">
            <span className="field-label">你的问题</span>
            <textarea
              rows={5}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="具体描述当前情况、目标、限制…"
            />
          </label>

          {mode === "guidance" && (
            <div className="upload">
              <div className="upload-head">
                <span>上传动作素材（可选）</span>
              </div>

              <div className="upload-kind-row">
                <button
                  className={attachmentKind === "image" ? "segment segment-active" : "segment"}
                  onClick={() => {
                    setAttachmentKind("image");
                    setAttachmentFile(null);
                  }}
                  type="button"
                >
                  图片
                </button>
                <button
                  className={attachmentKind === "video" ? "segment segment-active" : "segment"}
                  onClick={() => {
                    setAttachmentKind("video");
                    setAttachmentFile(null);
                  }}
                  type="button"
                >
                  视频
                </button>
              </div>

              <label className="dropzone">
                <input
                  accept={attachmentKind === "image" ? "image/*" : "video/mp4,video/quicktime,video/webm"}
                  onChange={(event) => setAttachmentFile(event.target.files?.[0] ?? null)}
                  type="file"
                />
                <strong>
                  {attachmentFile
                    ? attachmentFile.name
                    : attachmentKind === "image"
                      ? "选择一张动作照片"
                      : "选择一个动作视频"}
                </strong>
                <small>
                  {attachmentKind === "image" ? "jpg / png / webp" : "mp4 / mov / webm · ≤ 16MB"}
                </small>
              </label>

              {attachmentPreviewUrl && (
                <div className="upload-preview">
                  {attachmentKind === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt="上传预览" src={attachmentPreviewUrl} />
                  ) : (
                    <video controls src={attachmentPreviewUrl} />
                  )}
                  <button
                    className="btn btn-ghost btn-compact"
                    onClick={() => setAttachmentFile(null)}
                    type="button"
                  >
                    移除素材
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
              {isSubmitting ? "生成中…" : "生成建议"}
            </button>
            <span className="helper-text">输入越具体，生成结果越贴合你的情况。</span>
          </div>
        </section>

        {/* RIGHT: result */}
        <section className="card reveal" style={{ animationDelay: "80ms" }}>
          <header className="card-header">
            <div>
              <h2>建议</h2>
              <p>生成结果仅供参考，建议由真人教练复核后执行。</p>
            </div>
          </header>

          {response ? <Result response={response} /> : <EmptyState />}
        </section>
      </div>
    </MainLayout>
  );
}

function EmptyState() {
  return (
    <div className="empty">
      <span className="empty-icon" aria-hidden />
      输入问题并点击&ldquo;生成建议&rdquo;后，结果会显示在这里。
    </div>
  );
}

function Result({ response }: { response: AssistantResponse }) {
  const badgeClass = response.usedFallback ? "badge badge-warn" : "badge badge-ok";
  const badgeLabel = response.usedFallback ? "规则生成" : response.providerLabel;

  return (
    <div className="reveal">
      <div className="result-summary">
        <h3>{response.title}</h3>
        <p>{response.summary}</p>
        <div className="result-meta">
          <span className={badgeClass}>{badgeLabel}</span>
          {response.disclaimer && <span className="helper-text">{response.disclaimer}</span>}
        </div>
      </div>

      {response.highlights.length > 0 && (
        <ResultList title="重点" items={response.highlights} />
      )}

      {response.trainingPlan.length > 0 && (
        <div className="result-section">
          <p className="result-section-title">训练计划</p>
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

      {response.guidancePoints.length > 0 && (
        <ResultList title="动作要点" items={response.guidancePoints} />
      )}

      {response.nutritionTips.length > 0 && (
        <ResultList title="饮食建议" items={response.nutritionTips} />
      )}

      {response.reviewInsights.length > 0 && (
        <ResultList title="复盘结论" items={response.reviewInsights} />
      )}

      {response.recoveryActions.length > 0 && (
        <ResultList title="接下来" items={response.recoveryActions} />
      )}

      {response.safetyFlags.length > 0 && (
        <ResultList title="风险提醒" items={response.safetyFlags} warn />
      )}

      {response.nextSteps.length > 0 && (
        <ResultList title="后续步骤" items={response.nextSteps} />
      )}

      {response.citations.length > 0 && (
        <div className="result-section">
          <p className="result-section-title">参考来源</p>
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
