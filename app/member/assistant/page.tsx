"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/main-layout";
import { Reveal } from "@/components/reveal";
import { useDemo } from "@/lib/demo-store";
import type { AssistantAttachmentKind, AssistantMode, AssistantResponse } from "@/lib/demo-types";
import { isAssistantReady, supportsMultimodalAssistant } from "@/lib/model-settings";

const presets: Record<AssistantMode, string[]> = {
  plan: [
    "结合我当前目标和膝盖情况，生成一周训练计划和简化饮食建议。",
    "我最近工作比较忙，请帮我把计划做得更容易坚持。",
  ],
  guidance: [
    "我今天要做罗马尼亚硬拉，请给我动作要点、热身、休息和风险提醒。",
    "如果训练中出现下背不适，我应该怎么处理边界？",
  ],
  review: [
    "我这周完成了 3 次训练，有点疲劳，请帮我复盘并给出下周调整建议。",
    "请根据我最近的训练和体重变化，告诉我下周该怎么调。",
  ],
};

const modeLabels: Record<AssistantMode, string> = {
  plan: "计划生成",
  guidance: "动作指导",
  review: "复盘更新",
};

const applyLabels: Record<AssistantMode, string> = {
  plan: "当前计划",
  guidance: "动作指导",
  review: "复盘更新",
};

const initialMode: AssistantMode = "plan";

export default function MemberAssistantPage() {
  const router = useRouter();
  const {
    state: { session, memberProfile, modelSettings, appliedAssistantOutputs },
    applyAssistantResult,
    isSaving,
    isBootstrapped,
  } = useDemo();
  const [mode, setMode] = useState<AssistantMode>(initialMode);
  const [message, setMessage] = useState(presets[initialMode][0]);
  const [response, setResponse] = useState<AssistantResponse | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [attachmentKind, setAttachmentKind] = useState<AssistantAttachmentKind>("image");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState("");

  useEffect(() => {
    if (!isBootstrapped) return;
    if (!session.isAuthenticated) router.replace("/login");
    if (session.role && session.role !== "member") router.replace(`/${session.role}`);
  }, [isBootstrapped, session.isAuthenticated, session.role, router]);

  const assistantReady = useMemo(() => isAssistantReady(modelSettings), [modelSettings]);
  const multimodalReady = useMemo(() => supportsMultimodalAssistant(modelSettings), [modelSettings]);
  const appliedOutput = appliedAssistantOutputs[mode];

  useEffect(() => {
    setMessage(presets[mode][0]);
  }, [mode]);

  useEffect(() => {
    if (!attachmentFile) {
      setAttachmentPreviewUrl("");
      return;
    }

    const previewUrl = URL.createObjectURL(attachmentFile);
    setAttachmentPreviewUrl(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [attachmentFile]);

  useEffect(() => {
    if (mode !== "guidance") {
      setAttachmentFile(null);
      setAttachmentPreviewUrl("");
    }
  }, [mode]);

  async function submitAssistantRequest() {
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
            return fetch("/api/assistant", {
              method: "POST",
              body: formData,
            });
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
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "助理请求失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleApplyResult() {
    if (!response) return;
    setIsApplying(true);
    setError("");
    try {
      await applyAssistantResult(mode, response);
      window.alert(`已应用到${applyLabels[mode]}中。`);
    } catch (applyError) {
      setError(applyError instanceof Error ? applyError.message : "应用结果失败");
    } finally {
      setIsApplying(false);
    }
  }

  return (
    <MainLayout currentPath="/member/assistant">
      <Reveal>
        <section className="assistant-intro">
          <p className="eyebrow">训练助理</p>
          <h1>先生成，再决定是否应用</h1>
          <p className="assistant-meta">
            <span>目标：{memberProfile.goalLabel}</span>
            <span>状态：{assistantReady ? "已就绪" : "基础模式"}</span>
            <span>已保存：{appliedOutput ? "有" : "无"}</span>
          </p>
        </section>
      </Reveal>

      <Reveal delay={80}>
        <section className="assistant-card">
          <div className="assistant-card-title">选择场景</div>
          <div className="segmented">
            {(["plan", "guidance", "review"] as AssistantMode[]).map((item) => (
              <button
                className={item === mode ? "segment segment-active" : "segment"}
                key={item}
                onClick={() => setMode(item)}
                type="button"
              >
                {modeLabels[item]}
              </button>
            ))}
          </div>

          <div className="assistant-card-title">常用提问</div>
          <div className="preset-row">
            {presets[mode].map((preset) => (
              <button className="preset-chip-simple" key={preset} onClick={() => setMessage(preset)} type="button">
                {preset}
              </button>
            ))}
          </div>

          <label className="field field-wide">
            <span>你的问题</span>
            <textarea rows={5} value={message} onChange={(event) => setMessage(event.target.value)} />
          </label>

          {mode === "guidance" ? (
            <div className="assistant-upload">
              <div className="assistant-upload-head">
                <strong>上传动作素材（可选）</strong>
                <span className={multimodalReady ? "badge-outline" : "badge-neutral"}>
                  {multimodalReady ? "支持多模态" : "需图像/视频模型"}
                </span>
              </div>

              <div className="filter-row">
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

              <label className="upload-dropzone-simple">
                <input
                  accept={attachmentKind === "image" ? "image/*" : "video/mp4,video/quicktime,video/webm"}
                  className="upload-input"
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
                <p>{attachmentKind === "image" ? "jpg / png / webp" : "mp4 / mov / webm，≤ 16MB"}</p>
              </label>

              {attachmentPreviewUrl ? (
                <div className="upload-preview-simple">
                  {attachmentKind === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt="动作上传预览" className="upload-preview-image" src={attachmentPreviewUrl} />
                  ) : (
                    <video className="upload-preview-video" controls src={attachmentPreviewUrl} />
                  )}
                  <button className="button-tertiary compact" onClick={() => setAttachmentFile(null)} type="button">
                    移除素材
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {error ? <div className="assistant-error">{error}</div> : null}

          <div className="submit-row">
            <button
              className="button-primary"
              disabled={isSubmitting || !message.trim()}
              onClick={() => void submitAssistantRequest()}
              type="button"
            >
              {isSubmitting ? "生成中..." : "生成建议"}
            </button>
            <span className="helper-text">生成结果只在你确认后才会保存。</span>
          </div>
        </section>
      </Reveal>

      <Reveal delay={160}>
        <section className="assistant-card">
          <div className="assistant-card-title">生成结果</div>

          {response ? (
            <div className="assistant-results">
              <article className="assistant-summary-simple">
                <strong>{response.title}</strong>
                <p>{response.summary}</p>
              </article>

              {response.highlights.length ? (
                <div className="bullet-stack">
                  {response.highlights.map((item) => (
                    <div className="bullet-card" key={item}>
                      <p>{item}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              {response.trainingPlan.length ? (
                <div className="schedule-table">
                  {response.trainingPlan.map((day) => (
                    <div className="schedule-row schedule-row-interactive" key={day.dayLabel}>
                      <div>
                        <strong>{day.dayLabel}</strong>
                        <p>{day.focus}</p>
                      </div>
                      <div>{day.duration}</div>
                      <div>{day.intensity}</div>
                      <div>{day.note}</div>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="member-reading-flow">
                {response.nutritionTips.length ? (
                  <div className="bullet-stack">
                    <div className="section-caption">饮食建议</div>
                    {response.nutritionTips.map((item) => (
                      <div className="bullet-card" key={item}>
                        <p>{item}</p>
                      </div>
                    ))}
                  </div>
                ) : null}

                {response.guidancePoints.length ? (
                  <div className="bullet-stack">
                    <div className="section-caption">动作要点</div>
                    {response.guidancePoints.map((item) => (
                      <div className="bullet-card" key={item}>
                        <p>{item}</p>
                      </div>
                    ))}
                  </div>
                ) : null}

                {response.reviewInsights.length ? (
                  <div className="bullet-stack">
                    <div className="section-caption">复盘建议</div>
                    {response.reviewInsights.map((item) => (
                      <div className="bullet-card" key={item}>
                        <p>{item}</p>
                      </div>
                    ))}
                  </div>
                ) : null}

                {response.recoveryActions.length ? (
                  <div className="bullet-stack">
                    <div className="section-caption">接下来</div>
                    {response.recoveryActions.map((item) => (
                      <div className="bullet-card" key={item}>
                        <p>{item}</p>
                      </div>
                    ))}
                  </div>
                ) : null}

                {response.safetyFlags.length ? (
                  <div className="bullet-stack">
                    <div className="section-caption">风险提醒</div>
                    {response.safetyFlags.map((item) => (
                      <div className="bullet-card risk-card" key={item}>
                        <p>{item}</p>
                      </div>
                    ))}
                  </div>
                ) : null}

                {response.citations.length ? (
                  <div className="citation-list">
                    <div className="section-caption">参考来源</div>
                    {response.citations.map((item) => (
                      <article className="citation-card" key={`${item.source}-${item.title}`}>
                        <strong>{item.title}</strong>
                        <p>{item.note}</p>
                        <span>{item.source}</span>
                      </article>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="submit-row">
                <button
                  className="button-primary"
                  disabled={isApplying || isSaving}
                  onClick={() => void handleApplyResult()}
                  type="button"
                >
                  {isApplying ? "应用中..." : `应用到${applyLabels[mode]}`}
                </button>
                <span className="helper-text">
                  {mode === "plan"
                    ? "应用后会覆盖当前周计划。"
                    : mode === "guidance"
                      ? "应用后会保存为当前指导。"
                      : "应用后会保存为当前复盘。"}
                </span>
              </div>
            </div>
          ) : (
            <div className="assistant-empty">先输入问题，再生成建议。</div>
          )}
        </section>
      </Reveal>

      {appliedOutput ? (
        <Reveal delay={220}>
          <section className="assistant-card">
            <div className="assistant-card-title">已保存内容</div>
            <article className="assistant-summary-simple">
              <strong>{appliedOutput.title ?? "当前已应用版本"}</strong>
              <p>{appliedOutput.summary}</p>
              <span className="helper-text">保存时间：{appliedOutput.appliedAt.replace("T", " ").slice(0, 16)}</span>
            </article>
          </section>
        </Reveal>
      ) : null}
    </MainLayout>
  );
}
