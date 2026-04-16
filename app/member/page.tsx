"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/main-layout";
import { memberJourney } from "@/lib/mock-data";
import { useDemo } from "@/lib/demo-store";
import type { MemberProfile } from "@/lib/demo-types";

export default function MemberHomePage() {
  const router = useRouter();
  const {
    state: { session, memberProfile, review, weeklyPlan },
    saveProfile,
    isSaving,
    isBootstrapped,
  } = useDemo();
  const [form, setForm] = useState<MemberProfile>(memberProfile);
  const completedCount = weeklyPlan.days.filter((day) => day.completed).length;
  const completionRate = Math.round((completedCount / Math.max(weeklyPlan.days.length, 1)) * 100);

  useEffect(() => {
    if (!isBootstrapped) return;
    if (!session.isAuthenticated) router.replace("/login");
    if (session.role && session.role !== "member") router.replace(`/${session.role}`);
  }, [isBootstrapped, session.isAuthenticated, session.role, router]);

  useEffect(() => {
    setForm(memberProfile);
  }, [memberProfile]);

  return (
    <MainLayout currentPath="/member">
      <section className="hero-panel member-hero">
        <div className="member-hero-copy">
          <p className="eyebrow">会员训练驾驶舱</p>
          <h1>让会员、AI 和真人教练在同一套训练服务链路里协同工作。</h1>
          <p className="hero-copy">会员端保留更完整的品牌感和训练氛围。这里可以编辑画像、查看计划、提交复盘，并实时看到系统和教练的更新。</p>
          <div className="hero-chip-row">
            <span className="hero-chip">{memberProfile.goalLabel}</span>
            <span className="hero-chip">{memberProfile.trainingLevel}</span>
            <span className="hero-chip">{memberProfile.wearablePermissionStatus}</span>
          </div>
          <div className="hero-actions">
            <a className="button-ghost" href="/member/assistant">打开 AI 助理</a>
            <a className="button-primary" href="/member/plan">查看本周计划</a>
            <a className="button-secondary" href="/member/review">提交本周复盘</a>
          </div>
        </div>
        <div className="member-showcase">
          <div className="showcase-main">
            <span className="mini-label">训练状态</span>
            <strong>{completionRate}%</strong>
            <p>本周已经完成 {completedCount} / {weeklyPlan.days.length} 次训练，系统将据此持续调整下周负荷。</p>
          </div>
          <div className="hero-grid">
            <div className="glass-card glass-card-contrast"><span className="mini-label">我的教练</span><strong>{memberProfile.coachName}</strong><p>{memberProfile.locationName}</p></div>
            <div className="glass-card"><span className="mini-label">当前目标</span><strong>{memberProfile.goalLabel}</strong><p>{memberProfile.goalWindow}</p></div>
            <div className="glass-card"><span className="mini-label">最新人工修改</span><strong>计划 v{memberProfile.planVersion}</strong><p>{memberProfile.lastCoachEditReason}</p></div>
          </div>
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="stat-card member-stat-card"><p>本周完成率</p><strong>{completionRate}%</strong><span>已完成 {completedCount} / {weeklyPlan.days.length} 次训练</span></article>
        <article className="stat-card member-stat-card"><p>当前训练天数</p><strong>{memberProfile.trainingDays} 天</strong><span>{memberProfile.sessionMinutes} 分钟 / 次</span></article>
        <article className="stat-card member-stat-card"><p>体重趋势</p><strong>{review.weightChangeKg} kg</strong><span>最近一次复盘提交结果</span></article>
        <article className="stat-card member-stat-card"><p>风险状态</p><strong>{review.riskLevel === "high" ? "高" : review.riskLevel === "watch" ? "关注" : "正常"}</strong><span>{review.nextAdjustment}</span></article>
      </section>

      <section className="member-highlight-grid">
        <article className="panel mood-card">
          <p className="eyebrow">训练画像</p>
          <h2>当前训练基线</h2>
          <div className="mood-metrics">
            <div><span>训练水平</span><strong>{memberProfile.trainingLevel}</strong></div>
            <div><span>器械条件</span><strong>{memberProfile.equipmentAccess}</strong></div>
            <div><span>饮食策略</span><strong>{memberProfile.dietPreference}</strong></div>
          </div>
        </article>
        <article className="panel mood-card accent-panel">
          <p className="eyebrow">恢复策略</p>
          <h2>下次训练提示</h2>
          <p className="hero-copy">{review.nextAdjustment}</p>
          <div className="hero-chip-row">
            <span className="hero-chip">疲劳 {review.fatigueScore}/10</span>
            <span className="hero-chip">版本 v{memberProfile.planVersion}</span>
          </div>
        </article>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div><p className="eyebrow">AI 助理</p><h2>计划、饮食、动作、复盘统一入口</h2></div>
          <a className="button-secondary compact" href="/member/assistant">进入助理</a>
        </div>
        <div className="mood-metrics">
          <div><span>计划生成</span><strong>训练计划 + 简化饮食建议</strong></div>
          <div><span>动作指导</span><strong>动作要点 + 风险边界 + 引用</strong></div>
          <div><span>复盘更新</span><strong>训练复盘 + 下周调整建议</strong></div>
        </div>
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="panel-header">
            <div><p className="eyebrow">会员画像</p><h2>可编辑资料表单</h2></div>
            <span className="badge-outline">SQLite 持久化</span>
          </div>
          <form className="form-grid" onSubmit={(event) => { event.preventDefault(); void saveProfile(form); }}>
            <label className="field"><span>会员姓名</span><input value={form.memberName} onChange={(event) => setForm({ ...form, memberName: event.target.value })} /></label>
            <label className="field"><span>所属教练</span><input value={form.coachName} onChange={(event) => setForm({ ...form, coachName: event.target.value })} /></label>
            <label className="field"><span>门店</span><input value={form.locationName} onChange={(event) => setForm({ ...form, locationName: event.target.value })} /></label>
            <label className="field"><span>目标</span><input value={form.goalLabel} onChange={(event) => setForm({ ...form, goalLabel: event.target.value })} /></label>
            <label className="field"><span>年龄</span><input type="number" value={form.age} onChange={(event) => setForm({ ...form, age: Number(event.target.value) })} /></label>
            <label className="field"><span>体重 (kg)</span><input type="number" value={form.weightKg} onChange={(event) => setForm({ ...form, weightKg: Number(event.target.value) })} /></label>
            <label className="field field-wide"><span>伤病/禁忌</span><textarea rows={3} value={form.injuryHistory} onChange={(event) => setForm({ ...form, injuryHistory: event.target.value })} /></label>
            <label className="field field-wide"><span>饮食偏好</span><textarea rows={3} value={form.dietPreference} onChange={(event) => setForm({ ...form, dietPreference: event.target.value })} /></label>
            <div className="submit-row field-wide">
              <button className="button-primary" disabled={isSaving} type="submit">保存会员画像</button>
              <span className="helper-text">当前账号：{session.displayName ?? "-"}</span>
            </div>
          </form>
        </article>

        <article className="panel">
          <div className="panel-header"><div><p className="eyebrow">服务进程</p><h2>会员体验链路</h2></div></div>
          <div className="journey-list">
            {memberJourney.map((step) => (
              <div className="journey-item" key={step.title}>
                <span className="journey-index">{step.step}</span>
                <div><strong>{step.title}</strong><p>{step.description}</p></div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </MainLayout>
  );
}
