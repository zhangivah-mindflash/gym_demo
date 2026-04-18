"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { MainLayout } from "@/components/main-layout";
import { Reveal } from "@/components/reveal";
import { guidanceLibrary, guidanceSignals } from "@/lib/mock-data";
import { useDemo } from "@/lib/demo-store";

export default function GuidanceDetailPage() {
  const {
    state: { session, knowledgeBase, appliedAssistantOutputs },
    isBootstrapped,
  } = useDemo();
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const [slug, setSlug] = useState("");

  useEffect(() => {
    setSlug(params?.slug ?? "");
  }, [params]);

  useEffect(() => {
    if (!isBootstrapped) return;
    if (!session.isAuthenticated) router.replace("/login");
    if (session.role && session.role !== "member") router.replace(`/${session.role}`);
  }, [isBootstrapped, session.isAuthenticated, session.role, router]);

  const enabledBuckets = new Set(knowledgeBase.filter((entry) => entry.enabled).map((entry) => entry.id));
  const appliedGuidance = appliedAssistantOutputs.guidance;
  const savedDetail = appliedGuidance
    ? {
        slug: "saved-guidance",
        emoji: "✨",
        exercise: appliedGuidance.title,
        target: appliedGuidance.highlights[0] ?? "已保存训练指导",
        focus: appliedGuidance.highlights[1] ?? "来自最近一次 AI 已应用内容",
        difficulty: "当前版本",
        coachNote: appliedGuidance.nextSteps[0] ?? "训练时优先执行当前保存建议。",
        summary: appliedGuidance.summary,
        order: appliedGuidance.nextSteps.length ? appliedGuidance.nextSteps : ["先读摘要", "再看动作要点", "最后确认风险提醒"],
        cues: appliedGuidance.guidancePoints.length ? appliedGuidance.guidancePoints : appliedGuidance.highlights,
        warnings: appliedGuidance.safetyFlags,
        sourceLabel: "AI 已保存",
        citations: appliedGuidance.citations,
      }
    : null;

  const selected = useMemo(() => {
    if (!slug) return null;
    if (slug === "saved-guidance") return savedDetail;

    const base = guidanceLibrary.find((item) => item.slug === slug);
    if (!base) return null;
    return {
      ...base,
      citations: [
        {
          title: "动作规范库",
          note: `${base.exercise} 的核心控制点已同步到当前动作库。`,
          source: "KB-动作规范",
          bucket: "kb-motion",
        },
        {
          title: "安全注意事项",
          note: base.warnings[0],
          source: "KB-安全边界",
          bucket: "kb-safety",
        },
      ],
    };
  }, [savedDetail, slug]);

  const detailCitations = (selected?.citations ?? []).filter((item) => {
    const bucket = "bucket" in item && typeof item.bucket === "string" ? item.bucket : "";
    if (!bucket) return true;
    return enabledBuckets.has(bucket);
  });

  if (!slug) {
    return <MainLayout currentPath="/member/guidance"><div className="route-loading">加载中...</div></MainLayout>;
  }

  if (!selected) {
    return (
      <MainLayout currentPath="/member/guidance">
        <section className="panel member-section">
          <div className="empty-state">没有找到这个动作指导。你可以回到动作库重新选择。</div>
          <div className="submit-row">
            <Link className="button-primary" href="/member/guidance">返回动作库</Link>
          </div>
        </section>
      </MainLayout>
    );
  }

  return (
    <MainLayout currentPath="/member/guidance">
      <Reveal>
        <section className="page-intro member-page-intro">
          <div>
            <p className="eyebrow">动作细节</p>
            <h1>{selected.emoji} {selected.exercise}</h1>
            <p>{selected.summary}</p>
          </div>
          <div className="intro-badges">
            <span className="badge-outline">🎯 {selected.target}</span>
            <span className="badge-outline">⚡ {selected.focus}</span>
          </div>
        </section>
      </Reveal>

      <Reveal delay={80}>
        <section className="panel member-section">
          <div className="detail-hero-grid">
            <article className="detail-stat-card">
              <span>适合目标</span>
              <strong>{selected.target}</strong>
            </article>
            <article className="detail-stat-card">
              <span>训练难度</span>
              <strong>{selected.difficulty}</strong>
            </article>
            <article className="detail-stat-card">
              <span>来源</span>
              <strong>{selected.sourceLabel}</strong>
            </article>
            <article className="detail-stat-card">
              <span>真人建议</span>
              <strong>{selected.coachNote}</strong>
            </article>
          </div>
        </section>
      </Reveal>

      <Reveal delay={140}>
        <section className="panel member-section">
          <div className="panel-header">
            <div>
              <p className="eyebrow">动作顺序</p>
              <h2>照着这条顺序执行</h2>
            </div>
            <Link className="button-secondary compact" href="/member/guidance">
              返回动作库
            </Link>
          </div>
          <div className="step-strip">
            {selected.order.map((step, index) => (
              <article className="step-card" key={step}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{step}</strong>
              </article>
            ))}
          </div>
        </section>
      </Reveal>

      <Reveal delay={200}>
        <section className="panel member-section">
          <div className="member-reading-flow">
            <div className="bullet-stack">
              <div className="section-caption">✅ 动作要点</div>
              {selected.cues.map((item) => (
                <div className="bullet-card bullet-card-lift" key={item}>
                  <p>{item}</p>
                </div>
              ))}
            </div>

            <div className="bullet-stack">
              <div className="section-caption">⚠️ 风险提醒</div>
              {(selected.warnings.length ? selected.warnings : guidanceSignals[0].risks).map((item) => (
                <div className="bullet-card risk-card" key={item}>
                  <p>{item}</p>
                </div>
              ))}
            </div>

            <article className="coach-voice-card">
              <span className="mini-label">Coach Voice</span>
              <strong>👨‍🏫 真人教练建议</strong>
              <p>{selected.coachNote}</p>
            </article>
          </div>
        </section>
      </Reveal>

      {detailCitations.length ? (
        <Reveal delay={260}>
          <section className="panel member-section">
            <div className="panel-header">
              <div>
                <p className="eyebrow">参考来源</p>
                <h2>当前可解释依据</h2>
              </div>
            </div>
            <div className="citation-list">
              {detailCitations.map((item) => (
                <article className="citation-card citation-card-bright" key={`${item.source}-${item.title}`}>
                  <strong>{item.title}</strong>
                  <p>{item.note}</p>
                  <span>{item.source}</span>
                </article>
              ))}
            </div>
          </section>
        </Reveal>
      ) : null}
    </MainLayout>
  );
}
