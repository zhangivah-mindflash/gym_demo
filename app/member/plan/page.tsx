"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/main-layout";
import { nutritionHints } from "@/lib/mock-data";
import { useDemo } from "@/lib/demo-store";

export default function MemberPlanPage() {
  const {
    state: { session, memberProfile, weeklyPlan, coachEdits },
    togglePlanDay,
    isSaving,
    isBootstrapped,
  } = useDemo();
  const router = useRouter();
  const completedDays = weeklyPlan.days.filter((day) => day.completed).length;
  const completionRate = Math.round((completedDays / Math.max(weeklyPlan.days.length, 1)) * 100);
  const nextPendingDay = weeklyPlan.days.find((day) => !day.completed) ?? weeklyPlan.days[0];

  useEffect(() => {
    if (!isBootstrapped) return;
    if (!session.isAuthenticated) router.replace("/login");
    if (session.role && session.role !== "member") router.replace(`/${session.role}`);
  }, [isBootstrapped, session.isAuthenticated, session.role, router]);

  return (
    <MainLayout currentPath="/member/plan">
      <section className="page-intro member-page-intro">
        <div>
          <p className="eyebrow">我的计划</p>
          <h1>{memberProfile.memberName} 的训练计划</h1>
          <p>会员端可以查看结构化计划、打卡完成情况，以及真人教练对 AI 计划的修改理由。</p>
        </div>
        <div className="intro-badges">
          <span className="badge-outline">计划版本 v{memberProfile.planVersion}</span>
          <span className="badge-outline">最近理由 {memberProfile.lastCoachEditReason}</span>
        </div>
      </section>

      <section className="member-highlight-grid">
        <article className="panel spotlight-card">
          <p className="eyebrow">周执行概览</p>
          <h2>{completionRate}% 已完成</h2>
          <p>你的计划节奏已经形成可追踪闭环，AI 会结合打卡和复盘自动更新下周建议。</p>
          <div className="hero-chip-row">
            <span className="hero-chip">{memberProfile.trainingDays} 天计划</span>
            <span className="hero-chip">{memberProfile.sessionMinutes} 分钟 / 次</span>
          </div>
        </article>
        <article className="panel mood-card">
          <p className="eyebrow">下一次训练</p>
          <h2>{nextPendingDay?.dayLabel ?? "本周已完成"}</h2>
          <p>{nextPendingDay?.focus ?? "当前计划已全部完成，可等待下周调整。"} </p>
          <div className="hero-chip-row">
            <span className="hero-chip">{nextPendingDay?.duration ?? "--"}</span>
            <span className="hero-chip">{nextPendingDay?.intensity ?? "--"}</span>
          </div>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="panel-header"><div><p className="eyebrow">周计划表</p><h2>训练完成打卡</h2></div></div>
          <div className="schedule-table">
            {weeklyPlan.days.map((day) => (
              <div className={day.completed ? "schedule-row schedule-row-interactive schedule-row-glow" : "schedule-row schedule-row-interactive"} key={day.id}>
                <div><strong>{day.dayLabel}</strong><p>{day.focus}</p></div>
                <div>{day.duration}</div>
                <div>{day.intensity}</div>
                <div>{day.coachNote}</div>
                <div className="row-actions">
                  <button className={day.completed ? "button-secondary compact" : "button-primary compact"} disabled={isSaving} onClick={() => void togglePlanDay(day.id)} type="button">
                    {day.completed ? "取消完成" : "标记完成"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-header"><div><p className="eyebrow">简化饮食建议</p><h2>轻量规则</h2></div></div>
          <div className="bullet-stack">
            {nutritionHints.map((item) => (
              <div className="bullet-card bullet-card-lift" key={item.title}><strong>{item.title}</strong><p>{item.body}</p></div>
            ))}
          </div>
        </article>
      </section>

      <section className="panel">
        <div className="panel-header"><div><p className="eyebrow">教练修改历史</p><h2>用户可见的人工参与</h2></div></div>
        <div className="edit-list">
          {coachEdits.map((edit) => (
            <article className="edit-card" key={edit.id}>
              <div className="edit-head"><strong>{edit.exercise}</strong><span className="badge-accent">{edit.editor}</span></div>
              <p><span className="label-inline">AI 初稿：</span>{edit.aiVersion}</p>
              <p><span className="label-inline">教练调整：</span>{edit.coachVersion}</p>
              <p><span className="label-inline">修改理由：</span>{edit.reason}</p>
            </article>
          ))}
        </div>
      </section>
    </MainLayout>
  );
}
