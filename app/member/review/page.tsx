"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/main-layout";
import { Reveal } from "@/components/reveal";
import { useDemo } from "@/lib/demo-store";

export default function MemberReviewPage() {
  const {
    state: { session, memberProfile, review, weeklyPlan, appliedAssistantOutputs },
    submitReview,
    isSaving,
    isBootstrapped,
  } = useDemo();
  const router = useRouter();
  const appliedReview = appliedAssistantOutputs.review;
  const [form, setForm] = useState({
    memberId: memberProfile.id,
    completedSessions: review.completedSessions,
    fatigueScore: review.fatigueScore,
    weightChangeKg: review.weightChangeKg,
    note: review.note,
  });

  useEffect(() => {
    if (!isBootstrapped) return;
    if (!session.isAuthenticated) router.replace("/login");
    if (session.role && session.role !== "member") router.replace(`/${session.role}`);
  }, [isBootstrapped, session.isAuthenticated, session.role, router]);

  useEffect(() => {
    setForm({
      memberId: memberProfile.id,
      completedSessions: review.completedSessions,
      fatigueScore: review.fatigueScore,
      weightChangeKg: review.weightChangeKg,
      note: review.note,
    });
  }, [memberProfile.id, review]);

  const completionRate = Math.round((review.completedSessions / Math.max(review.totalSessions, 1)) * 100);
  const completedCheckins = weeklyPlan.days.filter((day) => day.completed).length;

  return (
    <MainLayout currentPath="/member/review">
      <Reveal>
        <section className="page-intro member-page-intro">
        <div>
          <p className="eyebrow">复盘</p>
          <h1>用一页把本周训练交代清楚</h1>
          <p>复盘页只做三件事：回顾完成情况、补充你的主观感受、确认接下来怎么调整。</p>
        </div>
        <div className="intro-badges">
          <span className="badge-outline">当前计划 v{memberProfile.planVersion}</span>
          <span className="badge-outline">{review.riskLevel}</span>
        </div>
        </section>
      </Reveal>

      <Reveal delay={80}>
        <section className="panel member-section">
          <div className="icon-stat-grid">
            <article className="icon-stat-card"><span className="emoji-mark" aria-hidden="true">📈</span><div><span>完成率</span><strong>{completionRate}%</strong></div></article>
            <article className="icon-stat-card"><span className="emoji-mark" aria-hidden="true">✅</span><div><span>已打卡次数</span><strong>{completedCheckins} 次</strong></div></article>
            <article className="icon-stat-card"><span className="emoji-mark" aria-hidden="true">🌙</span><div><span>主观疲劳</span><strong>{review.fatigueScore} / 10</strong></div></article>
            <article className="icon-stat-card"><span className="emoji-mark" aria-hidden="true">✨</span><div><span>AI 已应用</span><strong>{appliedReview ? "是" : "否"}</strong></div></article>
          </div>
        </section>
      </Reveal>

      <Reveal delay={140}>
        <section className="panel member-section">
        <div className="panel-header">
          <div>
            <p className="eyebrow">本周反馈</p>
            <h2>先提交你的真实感受</h2>
          </div>
        </div>
        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            void submitReview(form);
          }}
        >
          <label className="field">
            <span>本周完成次数</span>
            <input
              type="number"
              max={memberProfile.trainingDays}
              min={0}
              value={form.completedSessions}
              onChange={(event) => setForm({ ...form, completedSessions: Number(event.target.value) })}
            />
          </label>
          <label className="field">
            <span>主观疲劳 (1-10)</span>
            <input
              type="number"
              max={10}
              min={1}
              value={form.fatigueScore}
              onChange={(event) => setForm({ ...form, fatigueScore: Number(event.target.value) })}
            />
          </label>
          <label className="field field-wide">
            <span>体重变化 (kg)</span>
            <input
              type="number"
              step="0.1"
              value={form.weightChangeKg}
              onChange={(event) => setForm({ ...form, weightChangeKg: Number(event.target.value) })}
            />
          </label>
          <label className="field field-wide">
            <span>训练感受 / 风险备注</span>
            <textarea rows={5} value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} />
          </label>
          <div className="submit-row field-wide">
            <button className="button-primary" disabled={isSaving} type="submit">
              提交复盘
            </button>
            <Link className="button-secondary" href="/member/assistant">
              让 AI 生成复盘建议
            </Link>
            </div>
          </form>
        </section>
      </Reveal>

      <Reveal delay={200}>
        <section className="panel member-section">
        <div className="panel-header">
          <div>
            <p className="eyebrow">接下来怎么调整</p>
            <h2>{appliedReview?.title ?? "当前建议"}</h2>
          </div>
          {appliedReview ? <span className="badge-accent">已保存</span> : null}
        </div>
        <div className="member-reading-flow">
          <article className="assistant-summary-card">
            <p>{appliedReview?.summary ?? review.nextAdjustment}</p>
            {appliedReview ? (
              <span className="helper-text">应用时间：{appliedReview.appliedAt.replace("T", " ").slice(0, 16)}</span>
            ) : null}
          </article>

          {appliedReview?.reviewInsights.length ? (
            <div className="bullet-stack">
              <div className="section-caption">复盘结论</div>
              {appliedReview.reviewInsights.map((item) => (
                <div className="bullet-card bullet-card-lift" key={item}>
                  <p>{item}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="bullet-stack">
              <div className="section-caption">当前判断</div>
              <div className="bullet-card">
                <p>当前疲劳评分为 {review.fatigueScore} / 10。</p>
              </div>
              <div className="bullet-card">
                <p>{review.nextAdjustment}</p>
              </div>
              <div className="bullet-card">
                <p>{review.note}</p>
              </div>
            </div>
          )}

          {appliedReview?.recoveryActions.length ? (
            <div className="bullet-stack">
              <div className="section-caption">恢复动作</div>
              {appliedReview.recoveryActions.map((item) => (
                <div className="bullet-card bullet-card-lift" key={item}>
                  <p>{item}</p>
                </div>
              ))}
            </div>
          ) : null}

          {appliedReview?.nextSteps.length ? (
            <div className="bullet-stack">
              <div className="section-caption">下一步</div>
              {appliedReview.nextSteps.map((item) => (
                <div className="bullet-card" key={item}>
                  <p>{item}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        </section>
      </Reveal>
    </MainLayout>
  );
}
