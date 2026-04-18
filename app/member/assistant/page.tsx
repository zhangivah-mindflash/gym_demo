"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/main-layout";
import { Reveal } from "@/components/reveal";
import { useDemo } from "@/lib/demo-store";
import type { AssistantMode, AssistantResponse } from "@/lib/demo-types";
import { isAssistantReady } from "@/lib/model-settings";

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

  useEffect(() => {
    if (!isBootstrapped) return;
    if (!session.isAuthenticated) router.replace("/login");
    if (session.role && session.role !== "member") router.replace(`/${session.role}`);
  }, [isBootstrapped, session.isAuthenticated, session.role, router]);

  const assistantReady = useMemo(() => isAssistantReady(modelSettings), [modelSettings]);
  const appliedOutput = appliedAssistantOutputs[mode];

  useEffect(() => {
    setMessage(presets[mode][0]);
  }, [mode]);

  async function submitAssistantRequest() {
    setIsSubmitting(true);
    setError("");

    try {
      const apiResponse = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, message }),
      });

      const json = (await apiResponse.json()) as { data?: AssistantResponse; error?: string };
      if (!apiResponse.ok || !json.data) {
        throw new Error(json.error ?? "AI 助理请求失败");
      }

      setResponse(json.data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "AI 助理请求失败");
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
        <section className="page-intro member-page-intro">
          <div>
            <p className="eyebrow">智能助理</p>
            <h1>让 AI 先出建议，你再决定是否采用</h1>
            <p>这里不直接改动你的页面内容。先生成，再确认，再应用。</p>
          </div>
          <div className="intro-badges">
            <span className={assistantReady ? "badge-accent" : "badge-neutral"}>{assistantReady ? "✨ 已准备好" : "🧩 基础模式"}</span>
            <span className="badge-outline">🎯 {memberProfile.goalLabel}</span>
          </div>
        </section>
      </Reveal>

      <Reveal delay={80}>
        <section className="panel member-section">
          <div className="icon-stat-grid">
            <article className="icon-stat-card"><span className="emoji-mark" aria-hidden="true">🎯</span><div><span>当前目标</span><strong>{memberProfile.goalLabel}</strong></div></article>
            <article className="icon-stat-card"><span className="emoji-mark" aria-hidden="true">🗓️</span><div><span>训练频率</span><strong>{memberProfile.trainingDays} 天 / 周</strong></div></article>
            <article className="icon-stat-card"><span className="emoji-mark" aria-hidden="true">🏟️</span><div><span>训练条件</span><strong>{memberProfile.equipmentAccess}</strong></div></article>
            <article className="icon-stat-card"><span className="emoji-mark" aria-hidden="true">💾</span><div><span>已保存结果</span><strong>{appliedOutput ? "已有内容" : "暂未保存"}</strong></div></article>
          </div>
        </section>
      </Reveal>

      <Reveal delay={140}>
        <section className="panel member-section">
        <div className="panel-header">
          <div><p className="eyebrow">选择场景</p><h2>让助理处理当前需求</h2></div>
        </div>
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

        <div className="preset-row">
          {presets[mode].map((preset) => (
            <button className="hero-chip preset-chip" key={preset} onClick={() => setMessage(preset)} type="button">
              {preset}
            </button>
          ))}
        </div>

        <label className="field field-wide">
          <span>输入你的问题</span>
          <textarea rows={6} value={message} onChange={(event) => setMessage(event.target.value)} />
        </label>

        {error ? <div className="empty-state">{error}</div> : null}

        <div className="submit-row">
          <button className="button-primary" disabled={isSubmitting || !message.trim()} onClick={() => void submitAssistantRequest()} type="button">
            {isSubmitting ? "生成中..." : `生成${modeLabels[mode]}建议`}
          </button>
          <span className="helper-text">生成结果只在你确认后才会保存到对应页面。</span>
        </div>
        </section>
      </Reveal>

      <Reveal delay={200}>
        <section className="panel member-section">
        <div className="panel-header">
          <div><p className="eyebrow">生成结果</p><h2>{response?.title ?? "等待生成结果"}</h2></div>
        </div>

        {response ? (
          <div className="assistant-results">
            <article className="assistant-summary-card">
              <p>{response.summary}</p>
            </article>

            {response.highlights.length ? (
              <div className="bullet-stack">
                {response.highlights.map((item) => (
                  <div className="bullet-card bullet-card-lift" key={item}>
                    <p>{item}</p>
                  </div>
                ))}
              </div>
            ) : null}

            {response.trainingPlan.length ? (
              <div className="schedule-table">
                {response.trainingPlan.map((day) => (
                  <div className="schedule-row schedule-row-interactive" key={day.dayLabel}>
                    <div><strong>{day.dayLabel}</strong><p>{day.focus}</p></div>
                    <div>{day.duration}</div>
                    <div>{day.intensity}</div>
                    <div>{day.note}</div>
                    <div className="row-actions"><span className="badge-outline">建议</span></div>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="member-reading-flow">
              {response.nutritionTips.length ? (
                <div className="bullet-stack">
                  <div className="section-caption">饮食建议</div>
                  {response.nutritionTips.map((item) => (
                    <div className="bullet-card bullet-card-lift" key={item}><p>{item}</p></div>
                  ))}
                </div>
              ) : null}

              {response.guidancePoints.length ? (
                <div className="bullet-stack">
                  <div className="section-caption">动作要点</div>
                  {response.guidancePoints.map((item) => (
                    <div className="bullet-card bullet-card-lift" key={item}><p>{item}</p></div>
                  ))}
                </div>
              ) : null}

              {response.reviewInsights.length ? (
                <div className="bullet-stack">
                  <div className="section-caption">复盘建议</div>
                  {response.reviewInsights.map((item) => (
                    <div className="bullet-card bullet-card-lift" key={item}><p>{item}</p></div>
                  ))}
                </div>
              ) : null}

              {response.recoveryActions.length ? (
                <div className="bullet-stack">
                  <div className="section-caption">接下来</div>
                  {response.recoveryActions.map((item) => (
                    <div className="bullet-card bullet-card-lift" key={item}><p>{item}</p></div>
                  ))}
                </div>
              ) : null}

              {response.safetyFlags.length ? (
                <div className="bullet-stack">
                  <div className="section-caption">风险提醒</div>
                  {response.safetyFlags.map((item) => (
                    <div className="bullet-card risk-card" key={item}><p>{item}</p></div>
                  ))}
                </div>
              ) : null}

              {response.citations.length ? (
                <div className="citation-list">
                  <div className="section-caption">参考来源</div>
                  {response.citations.map((item) => (
                    <article className="citation-card citation-card-bright" key={`${item.source}-${item.title}`}>
                      <strong>{item.title}</strong>
                      <p>{item.note}</p>
                      <span>{item.source}</span>
                    </article>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="submit-row">
              <button className="button-primary" disabled={isApplying || isSaving} onClick={() => void handleApplyResult()} type="button">
                {isApplying ? "应用中..." : `应用到${applyLabels[mode]}中`}
              </button>
              <span className="helper-text">
                {mode === "plan"
                  ? "应用后会覆盖当前周计划。"
                  : mode === "guidance"
                    ? "应用后会保存为当前指导卡片。"
                    : "应用后会保存为当前复盘建议。"}
              </span>
            </div>
          </div>
        ) : (
          <div className="empty-state">先输入你的问题，再生成本次建议。</div>
        )}
        </section>
      </Reveal>

      {appliedOutput ? (
        <Reveal delay={260}>
          <section className="panel member-section">
          <div className="panel-header">
            <div><p className="eyebrow">已保存内容</p><h2>当前已应用版本</h2></div>
          </div>
          <article className="assistant-summary-card">
            <p>{appliedOutput.summary}</p>
            <span className="helper-text">保存时间：{appliedOutput.appliedAt.replace("T", " ").slice(0, 16)}</span>
          </article>
          </section>
        </Reveal>
      ) : null}
    </MainLayout>
  );
}
