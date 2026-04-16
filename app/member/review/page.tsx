"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/main-layout";
import { useDemo } from "@/lib/demo-store";

export default function MemberReviewPage() {
  const {
    state: { session, memberProfile, review, weeklyPlan },
    submitReview,
    isSaving,
    isBootstrapped,
  } = useDemo();
  const router = useRouter();
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

  return (
    <MainLayout currentPath="/member/review">
      <section className="page-intro member-page-intro">
        <div>
          <p className="eyebrow">复盘迭代</p>
          <h1>提交本周训练复盘</h1>
          <p>提交之后会进入 SQLite，首页指标、教练待办和下周调整都会同步更新。</p>
        </div>
        <div className="intro-badges">
          <span className="badge-outline">当前计划 v{memberProfile.planVersion}</span>
          <span className="badge-outline">每周目标 {memberProfile.trainingDays} 练</span>
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="stat-card member-stat-card"><p>完成率</p><strong>{completionRate}%</strong><span>{review.completedSessions} / {review.totalSessions} 次</span></article>
        <article className="stat-card member-stat-card"><p>主观疲劳</p><strong>{review.fatigueScore} / 10</strong><span>分数越高说明恢复压力越大</span></article>
        <article className="stat-card member-stat-card"><p>体重变化</p><strong>{review.weightChangeKg} kg</strong><span>最近一周</span></article>
        <article className="stat-card member-stat-card"><p>风险级别</p><strong>{review.riskLevel}</strong><span>{review.nextAdjustment}</span></article>
      </section>

      <section className="member-highlight-grid">
        <article className="panel spotlight-card">
          <p className="eyebrow">恢复面板</p>
          <h2>{review.riskLevel === "high" ? "需要降载" : review.riskLevel === "watch" ? "建议观察" : "恢复正常"}</h2>
          <p>复盘并不是打分页面，而是会员和教练共同更新训练节奏的接口。</p>
        </article>
        <article className="panel mood-card accent-panel">
          <p className="eyebrow">本周摘要</p>
          <h2>{weeklyPlan.days.filter((day) => day.completed).length} 次已打卡</h2>
          <p>{review.nextAdjustment}</p>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="panel-header"><div><p className="eyebrow">训练记录</p><h2>提交复盘表单</h2></div></div>
          <form className="form-grid" onSubmit={(event) => { event.preventDefault(); void submitReview(form); }}>
            <label className="field"><span>本周完成次数</span><input type="number" max={memberProfile.trainingDays} min={0} value={form.completedSessions} onChange={(event) => setForm({ ...form, completedSessions: Number(event.target.value) })} /></label>
            <label className="field"><span>主观疲劳 (1-10)</span><input type="number" max={10} min={1} value={form.fatigueScore} onChange={(event) => setForm({ ...form, fatigueScore: Number(event.target.value) })} /></label>
            <label className="field field-wide"><span>体重变化 (kg)</span><input type="number" step="0.1" value={form.weightChangeKg} onChange={(event) => setForm({ ...form, weightChangeKg: Number(event.target.value) })} /></label>
            <label className="field field-wide"><span>训练感受 / 风险备注</span><textarea rows={5} value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} /></label>
            <div className="submit-row field-wide"><button className="button-primary" disabled={isSaving} type="submit">提交复盘</button></div>
          </form>
        </article>

        <article className="panel">
          <div className="panel-header"><div><p className="eyebrow">下周调整</p><h2>自动生成的复盘结论</h2></div></div>
          <div className="timeline">
            <div className="timeline-item"><strong>恢复判断</strong><p>当前疲劳评分为 {review.fatigueScore} / 10。</p></div>
            <div className="timeline-item"><strong>计划更新原则</strong><p>{review.nextAdjustment}</p></div>
            <div className="timeline-item"><strong>会员可见说明</strong><p>{review.note}</p></div>
          </div>
        </article>
      </section>
    </MainLayout>
  );
}
