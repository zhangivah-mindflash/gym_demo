"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/main-layout";
import { Reveal } from "@/components/reveal";
import { guidanceLibrary } from "@/lib/mock-data";
import { useDemo } from "@/lib/demo-store";

const filters = ["全部", "后链", "腿部", "上肢推", "稳定"] as const;

export default function MemberGuidancePage() {
  const {
    state: { session, appliedAssistantOutputs },
    isBootstrapped,
  } = useDemo();
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>("全部");

  useEffect(() => {
    if (!isBootstrapped) return;
    if (!session.isAuthenticated) router.replace("/login");
    if (session.role && session.role !== "member") router.replace(`/${session.role}`);
  }, [isBootstrapped, session.isAuthenticated, session.role, router]);

  const galleryItems = useMemo(() => {
    const baseItems = guidanceLibrary.map((item) => ({
      slug: item.slug,
      emoji: item.emoji,
      title: item.exercise,
      target: item.target,
      focus: item.focus,
      difficulty: item.difficulty,
      sourceLabel: item.sourceLabel,
      coachNote: item.coachNote,
      summary: item.summary,
      isSaved: false,
    }));

    const appliedGuidance = appliedAssistantOutputs.guidance;
    if (!appliedGuidance) return baseItems;

    return [
      {
        slug: "saved-guidance",
        emoji: "✨",
        title: appliedGuidance.title,
        target: appliedGuidance.highlights[0] ?? "已保存训练建议",
        focus: "来自最近一次已应用的 AI 指导",
        difficulty: "当前版本",
        sourceLabel: "AI 已保存",
        coachNote: appliedGuidance.nextSteps[0] ?? "可进入详情继续查看。",
        summary: appliedGuidance.summary,
        isSaved: true,
      },
      ...baseItems,
    ];
  }, [appliedAssistantOutputs.guidance]);

  const filteredItems = galleryItems.filter((item) => {
    if (activeFilter === "全部") return true;
    return item.target.includes(activeFilter) || item.focus.includes(activeFilter);
  });

  return (
    <MainLayout currentPath="/member/guidance">
      <Reveal>
        <section className="page-intro member-page-intro">
          <div>
            <p className="eyebrow">动作指导</p>
            <h1>从动作库里直接选你今天要看的内容</h1>
            <p>先选动作，再进入细节。页面只保留对训练有帮助的信息，不把系统逻辑堆给会员阅读。</p>
          </div>
          <div className="intro-badges">
            <span className="badge-outline">📚 {galleryItems.length} 个可查看动作</span>
            <span className="badge-outline">✨ {appliedAssistantOutputs.guidance ? "含已保存 AI 指导" : "可叠加 AI 新建议"}</span>
          </div>
        </section>
      </Reveal>

      <Reveal delay={80}>
        <section className="panel member-section">
          <div className="member-compact-meta">
            <div>
              <span>浏览方式</span>
              <strong>先选动作</strong>
            </div>
            <div>
              <span>详情内容</span>
              <strong>要点 / 顺序 / 风险</strong>
            </div>
            <div>
              <span>真人建议</span>
              <strong>保留教练视角</strong>
            </div>
            <div>
              <span>AI 结果</span>
              <strong>{appliedAssistantOutputs.guidance ? "已并入动作库" : "可随时生成"}</strong>
            </div>
          </div>
        </section>
      </Reveal>

      <Reveal delay={140}>
        <section className="panel member-section">
          <div className="panel-header">
            <div>
              <p className="eyebrow">动作选择</p>
              <h2>挑一个动作开始看</h2>
            </div>
            <Link className="button-secondary compact" href="/member/assistant">
              让 AI 生成新指导
            </Link>
          </div>
          <div className="filter-row">
            {filters.map((filter) => (
              <button
                className={filter === activeFilter ? "segment segment-active" : "segment"}
                key={filter}
                onClick={() => setActiveFilter(filter)}
                type="button"
              >
                {filter}
              </button>
            ))}
          </div>
          <div className="guidance-gallery">
            {filteredItems.map((item, index) => (
              <Link className={item.isSaved ? "guidance-card guidance-card-featured" : "guidance-card"} href={`/member/guidance/${item.slug}`} key={item.slug}>
                <div className="guidance-cover">
                  <span className="guidance-emoji" aria-hidden="true">{item.emoji}</span>
                  <div className="guidance-cover-meta">
                    <span className="mini-label">{item.sourceLabel}</span>
                    <span className="badge-outline">0{index + 1}</span>
                  </div>
                </div>
                <div className="guidance-card-body">
                  <strong>{item.title}</strong>
                  <p>{item.summary}</p>
                  <div className="guidance-tags">
                    <span>🎯 {item.target}</span>
                    <span>⚡ {item.focus}</span>
                    <span>📈 {item.difficulty}</span>
                  </div>
                  <div className="guidance-card-footer">
                    <span>👨‍🏫 {item.coachNote}</span>
                    <span className="card-link">查看详情</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </Reveal>
    </MainLayout>
  );
}
