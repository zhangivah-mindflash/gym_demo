"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/main-layout";
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

const initialMode: AssistantMode = "plan";

export default function MemberAssistantPage() {
  const router = useRouter();
  const {
    state: { session, memberProfile, modelSettings },
    isBootstrapped,
  } = useDemo();
  const [mode, setMode] = useState<AssistantMode>(initialMode);
  const [message, setMessage] = useState(presets[initialMode][0]);
  const [response, setResponse] = useState<AssistantResponse | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isBootstrapped) return;
    if (!session.isAuthenticated) router.replace("/login");
    if (session.role && session.role !== "member") router.replace(`/${session.role}`);
  }, [isBootstrapped, session.isAuthenticated, session.role, router]);

  const assistantReady = useMemo(() => isAssistantReady(modelSettings), [modelSettings]);

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

  return (
    <MainLayout currentPath="/member/assistant">
      <section className="page-intro member-page-intro">
        <div>
          <p className="eyebrow">PulseLab AI Assistant</p>
          <h1>会员智能健身助理</h1>
          <p>这里是计划生成、简化饮食建议、动作指导和复盘更新的统一入口。管理员配置好模型后，这里会直接走真实 LLM；未配置时先用本地规则结果保证 demo 可用。</p>
        </div>
        <div className="intro-badges">
          <span className={assistantReady ? "badge-accent" : "badge-neutral"}>{assistantReady ? "已接入外部模型" : "当前为本地规则模式"}</span>
          <span className="badge-outline">{memberProfile.goalLabel}</span>
        </div>
      </section>

      <section className="member-highlight-grid">
        <article className="panel spotlight-card">
          <p className="eyebrow">当前画像</p>
          <h2>{memberProfile.memberName}</h2>
          <p>{memberProfile.locationName} · {memberProfile.coachName}</p>
          <div className="hero-chip-row">
            <span className="hero-chip">{memberProfile.trainingLevel}</span>
            <span className="hero-chip">{memberProfile.equipmentAccess}</span>
            <span className="hero-chip">{memberProfile.trainingDays} 天 / 周</span>
          </div>
        </article>
        <article className="panel mood-card accent-panel">
          <p className="eyebrow">使用方式</p>
          <h2>先选场景，再发起请求</h2>
          <p>计划生成会产出结构化训练日与简化饮食建议；动作指导会给风险边界和引用；复盘会产出下周调整逻辑。</p>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="panel-header">
            <div><p className="eyebrow">场景切换</p><h2>让 AI 处理不同任务</h2></div>
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
            <span>你的问题</span>
            <textarea
              rows={7}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
          </label>

          {error ? <div className="empty-state">{error}</div> : null}

          <div className="submit-row">
            <button className="button-primary" disabled={isSubmitting || !message.trim()} onClick={() => void submitAssistantRequest()} type="button">
              {isSubmitting ? "生成中..." : `生成${modeLabels[mode]}建议`}
            </button>
            <span className="helper-text">真实模型参数在管理员的“模型配置”页面填写。</span>
          </div>
        </article>

        <article className="panel media-card">
          <div className="media-frame">
            <div className="media-placeholder">
              <span className="mini-label">AI 助理定位</span>
              <strong>Structured Fitness Agent</strong>
              <p>不是普通聊天机器人，而是围绕计划、执行、复盘持续产出结果的健身助理。</p>
            </div>
          </div>
        </article>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div><p className="eyebrow">结果面板</p><h2>{response?.title ?? "等待生成结果"}</h2></div>
          {response ? <span className={response.usedFallback ? "badge-neutral" : "badge-accent"}>{response.providerLabel}</span> : null}
        </div>

        {response ? (
          <div className="assistant-results">
            <article className="assistant-summary-card">
              <p>{response.summary}</p>
              <span className="helper-text">{response.disclaimer}</span>
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
                    <div className="row-actions"><span className="badge-outline">AI 草案</span></div>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="assistant-section-grid">
              {response.nutritionTips.length ? (
                <article className="panel">
                  <div className="panel-header"><div><p className="eyebrow">饮食建议</p><h2>简化可执行规则</h2></div></div>
                  <div className="bullet-stack">
                    {response.nutritionTips.map((item) => (
                      <div className="bullet-card bullet-card-lift" key={item}><p>{item}</p></div>
                    ))}
                  </div>
                </article>
              ) : null}

              {response.guidancePoints.length ? (
                <article className="panel">
                  <div className="panel-header"><div><p className="eyebrow">动作指导</p><h2>执行重点</h2></div></div>
                  <div className="bullet-stack">
                    {response.guidancePoints.map((item) => (
                      <div className="bullet-card bullet-card-lift" key={item}><p>{item}</p></div>
                    ))}
                  </div>
                </article>
              ) : null}

              {response.reviewInsights.length ? (
                <article className="panel">
                  <div className="panel-header"><div><p className="eyebrow">复盘结论</p><h2>训练调整逻辑</h2></div></div>
                  <div className="bullet-stack">
                    {response.reviewInsights.map((item) => (
                      <div className="bullet-card bullet-card-lift" key={item}><p>{item}</p></div>
                    ))}
                  </div>
                </article>
              ) : null}

              {response.recoveryActions.length ? (
                <article className="panel">
                  <div className="panel-header"><div><p className="eyebrow">恢复与执行</p><h2>接下来怎么做</h2></div></div>
                  <div className="bullet-stack">
                    {response.recoveryActions.map((item) => (
                      <div className="bullet-card bullet-card-lift" key={item}><p>{item}</p></div>
                    ))}
                  </div>
                </article>
              ) : null}
            </div>

            <div className="assistant-section-grid">
              {response.safetyFlags.length ? (
                <article className="panel risk-panel">
                  <div className="panel-header"><div><p className="eyebrow">风险边界</p><h2>必须保守处理</h2></div></div>
                  <div className="bullet-stack">
                    {response.safetyFlags.map((item) => (
                      <div className="bullet-card risk-card" key={item}><p>{item}</p></div>
                    ))}
                  </div>
                </article>
              ) : null}

              {response.citations.length ? (
                <article className="panel">
                  <div className="panel-header"><div><p className="eyebrow">引用</p><h2>可解释来源</h2></div></div>
                  <div className="citation-list">
                    {response.citations.map((item) => (
                      <article className="citation-card citation-card-bright" key={`${item.source}-${item.title}`}>
                        <strong>{item.title}</strong>
                        <p>{item.note}</p>
                        <span>{item.source}</span>
                      </article>
                    ))}
                  </div>
                </article>
              ) : null}
            </div>

            {response.nextSteps.length ? (
              <article className="panel">
                <div className="panel-header"><div><p className="eyebrow">下一步</p><h2>建议动作</h2></div></div>
                <div className="bullet-stack">
                  {response.nextSteps.map((item) => (
                    <div className="bullet-card bullet-card-lift" key={item}><p>{item}</p></div>
                  ))}
                </div>
              </article>
            ) : null}
          </div>
        ) : (
          <div className="empty-state">先选择场景并提交问题，AI 助理会在这里返回结构化结果。</div>
        )}
      </section>
    </MainLayout>
  );
}
