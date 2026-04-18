"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/main-layout";
import { Reveal } from "@/components/reveal";
import { useDemo } from "@/lib/demo-store";
import type { MemberProfile } from "@/lib/demo-types";

export default function MemberHomePage() {
  const router = useRouter();
  const {
    state: { session, memberProfile, review, weeklyPlan, appliedAssistantOutputs },
    saveProfile,
    isSaving,
    isBootstrapped,
  } = useDemo();
  const [form, setForm] = useState<MemberProfile>(memberProfile);
  const completedCount = weeklyPlan.days.filter((day) => day.completed).length;
  const completionRate = Math.round((completedCount / Math.max(weeklyPlan.days.length, 1)) * 100);
  const hasSavedSuggestion = Boolean(
    appliedAssistantOutputs.plan || appliedAssistantOutputs.guidance || appliedAssistantOutputs.review,
  );

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
      <Reveal>
        <section className="hero-panel member-hero">
          <div className="member-hero-copy">
            <p className="eyebrow">本周训练</p>
            <h1>今天先做什么，一眼就知道</h1>
            <div className="hero-chip-row">
              <span className="hero-chip">🎯 {memberProfile.goalLabel}</span>
              <span className="hero-chip">📈 {memberProfile.trainingLevel}</span>
              <span className="hero-chip">🗓️ {memberProfile.trainingDays} 天 / 周</span>
            </div>
            <div className="hero-actions">
              <Link className="button-primary" href="/member/plan">查看本周计划</Link>
              <Link className="button-secondary" href="/member/guidance">进入动作库</Link>
              <Link className="button-secondary" href="/member/assistant">获取 AI 建议</Link>
            </div>
          </div>
          <div className="member-showcase">
            <div className="showcase-main">
              <span className="mini-label">本周完成率</span>
              <strong>{completionRate}%</strong>
              <p>已完成 {completedCount} / {weeklyPlan.days.length} 次训练</p>
            </div>
            <div className="hero-grid hero-grid-tight">
              <div className="glass-card glass-card-contrast">
                <span className="mini-label">👨‍🏫 教练</span>
                <strong>{memberProfile.coachName}</strong>
                <p>{memberProfile.locationName}</p>
              </div>
              <div className="glass-card">
                <span className="mini-label">⚠️ 当前提醒</span>
                <strong>{review.riskLevel === "high" ? "注意恢复" : "保持节奏"}</strong>
                <p>{review.nextAdjustment}</p>
              </div>
            </div>
          </div>
        </section>
      </Reveal>

      <Reveal delay={80}>
        <section className="panel member-section">
          <div className="icon-stat-grid">
            <article className="icon-stat-card">
              <span className="emoji-mark" aria-hidden="true">🔥</span>
              <div>
                <span>训练频率</span>
                <strong>{memberProfile.trainingDays} 天 / 周</strong>
              </div>
            </article>
            <article className="icon-stat-card">
              <span className="emoji-mark" aria-hidden="true">⏱️</span>
              <div>
                <span>单次时长</span>
                <strong>{memberProfile.sessionMinutes} 分钟</strong>
              </div>
            </article>
            <article className="icon-stat-card">
              <span className="emoji-mark" aria-hidden="true">🌙</span>
              <div>
                <span>恢复状态</span>
                <strong>疲劳 {review.fatigueScore}/10</strong>
              </div>
            </article>
            <article className="icon-stat-card">
              <span className="emoji-mark" aria-hidden="true">✨</span>
              <div>
                <span>已保存建议</span>
                <strong>{hasSavedSuggestion ? "已有内容" : "暂未保存"}</strong>
              </div>
            </article>
          </div>
        </section>
      </Reveal>

      <Reveal delay={140}>
        <section className="panel member-section">
          <div className="panel-header">
            <div>
              <p className="eyebrow">快速入口</p>
              <h2>从这里直接进入你最常看的 3 个板块</h2>
            </div>
          </div>
          <div className="quick-action-grid">
            <Link className="quick-action-card" href="/member/plan">
              <span className="emoji-mark" aria-hidden="true">📋</span>
              <strong>本周计划</strong>
              <p>{completedCount < weeklyPlan.days.length ? "继续完成剩余训练" : "本周已全部打卡"}</p>
            </Link>
            <Link className="quick-action-card" href="/member/guidance">
              <span className="emoji-mark" aria-hidden="true">🧭</span>
              <strong>动作指导</strong>
              <p>从动作画廊里进入具体动作细节</p>
            </Link>
            <Link className="quick-action-card" href="/member/review">
              <span className="emoji-mark" aria-hidden="true">📈</span>
              <strong>训练复盘</strong>
              <p>提交反馈并查看下周调整建议</p>
            </Link>
          </div>
        </section>
      </Reveal>

      <Reveal delay={200}>
        <section className="panel member-section">
          <div className="panel-header">
            <div>
              <p className="eyebrow">基础资料</p>
              <h2>你的目标和限制会影响后续建议</h2>
            </div>
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
        </section>
      </Reveal>
    </MainLayout>
  );
}
