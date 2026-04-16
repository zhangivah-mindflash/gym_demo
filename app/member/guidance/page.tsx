"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/main-layout";
import { guidanceBase, guidanceSignals } from "@/lib/mock-data";
import { useDemo } from "@/lib/demo-store";

export default function MemberGuidancePage() {
  const {
    state: { session, knowledgeBase },
    isBootstrapped,
  } = useDemo();
  const router = useRouter();
  const [signalId, setSignalId] = useState(guidanceSignals[0].id);
  const signal = guidanceSignals.find((item) => item.id === signalId) ?? guidanceSignals[0];
  const enabledBuckets = new Set(knowledgeBase.filter((entry) => entry.enabled).map((entry) => entry.id));
  const citations = guidanceBase.citations.filter((citation) => enabledBuckets.has(citation.bucket));

  useEffect(() => {
    if (!isBootstrapped) return;
    if (!session.isAuthenticated) router.replace("/login");
    if (session.role && session.role !== "member") router.replace(`/${session.role}`);
  }, [isBootstrapped, session.isAuthenticated, session.role, router]);

  return (
    <MainLayout currentPath="/member/guidance">
      <section className="page-intro member-page-intro">
        <div>
          <p className="eyebrow">动作指导</p>
          <h1>{guidanceBase.exercise}</h1>
          <p>动作指导会直接受后台知识库启停影响，保证 demo 能展示“后台配置影响前台结果”的真实效果。</p>
        </div>
        <div className="intro-badges">
          <span className="badge-outline">可信引用 {citations.length} 条</span>
          <span className="badge-outline">风险信号 {signal.label}</span>
        </div>
      </section>

      <section className="member-highlight-grid">
        <article className="panel media-card">
          <div className="media-frame">
            <div className="media-placeholder">
              <span className="mini-label">动作参考视频</span>
              <strong>Preview Placeholder</strong>
              <p>当前平台暂未上传正式视频，这里保留媒体位与播放氛围层。</p>
            </div>
          </div>
        </article>
        <article className="panel spotlight-card">
          <p className="eyebrow">执行原则</p>
          <h2>先稳定，再加重</h2>
          <p>{guidanceBase.warmup}</p>
          <div className="hero-chip-row">
            <span className="hero-chip">RPE 控制</span>
            <span className="hero-chip">有风险即降级</span>
          </div>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="panel-header"><div><p className="eyebrow">提问场景</p><h2>模拟不同风险信号</h2></div></div>
          <div className="segmented">
            {guidanceSignals.map((item) => (
              <button className={item.id === signalId ? "segment segment-active" : "segment"} key={item.id} onClick={() => setSignalId(item.id)} type="button">
                {item.label}
              </button>
            ))}
          </div>
        </article>

        <article className="panel risk-panel">
          <div className="panel-header"><div><p className="eyebrow">风险提醒</p><h2>{signal.label}</h2></div></div>
          <div className="bullet-stack">
            {signal.risks.map((risk) => (
              <div className="bullet-card risk-card" key={risk}><p>{risk}</p></div>
            ))}
          </div>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="panel-header"><div><p className="eyebrow">动作要点</p><h2>检索增强建议</h2></div></div>
          <div className="bullet-stack">
            {guidanceBase.cues.map((cue) => <div className="bullet-card bullet-card-lift" key={cue}><p>{cue}</p></div>)}
            <div className="bullet-card bullet-card-lift"><strong>热身</strong><p>{guidanceBase.warmup}</p></div>
            <div className="bullet-card bullet-card-lift"><strong>放松</strong><p>{guidanceBase.cooldown}</p></div>
          </div>
        </article>

        <article className="panel">
          <div className="panel-header"><div><p className="eyebrow">引用来源</p><h2>启用中的知识库</h2></div></div>
          <div className="citation-list">
            {citations.map((citation) => (
              <article className="citation-card citation-card-bright" key={citation.title}><strong>{citation.title}</strong><p>{citation.snippet}</p><span>{citation.source}</span></article>
            ))}
          </div>
        </article>
      </section>
    </MainLayout>
  );
}
