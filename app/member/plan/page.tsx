"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/main-layout";
import { Reveal } from "@/components/reveal";
import { nutritionHints } from "@/lib/mock-data";
import { useDemo } from "@/lib/demo-store";

export default function MemberPlanPage() {
  const {
    state: { session, memberProfile, weeklyPlan, coachEdits, appliedAssistantOutputs },
    togglePlanDay,
    isSaving,
    isBootstrapped,
  } = useDemo();
  const router = useRouter();
  const completedDays = weeklyPlan.days.filter((day) => day.completed).length;
  const completionRate = Math.round((completedDays / Math.max(weeklyPlan.days.length, 1)) * 100);
  const nextPendingDay = weeklyPlan.days.find((day) => !day.completed) ?? weeklyPlan.days[0];
  const appliedPlan = appliedAssistantOutputs.plan;

  useEffect(() => {
    if (!isBootstrapped) return;
    if (!session.isAuthenticated) router.replace("/login");
    if (session.role && session.role !== "member") router.replace(`/${session.role}`);
  }, [isBootstrapped, session.isAuthenticated, session.role, router]);

  return (
    <MainLayout currentPath="/member/plan">
      <Reveal>
        <section className="page-intro member-page-intro">
        <div>
          <p className="eyebrow">我的计划</p>
          <h1>先看本周主线，再去完成今天训练</h1>
          <p>这里保留当前正在执行的周计划、完成状态和教练调整说明。只有你确认应用后的 AI 结果，才会出现在这里。</p>
        </div>
        <div className="intro-badges">
          <span className="badge-outline">计划版本 v{memberProfile.planVersion}</span>
          <span className="badge-outline">{memberProfile.trainingDays} 天 / 周</span>
        </div>
        </section>
      </Reveal>

      <Reveal delay={80}>
        <section className="panel member-section">
          <div className="icon-stat-grid">
            <article className="icon-stat-card"><span className="emoji-mark" aria-hidden="true">✅</span><div><span>本周完成</span><strong>{completionRate}%</strong></div></article>
            <article className="icon-stat-card"><span className="emoji-mark" aria-hidden="true">🗓️</span><div><span>下一次训练</span><strong>{nextPendingDay?.dayLabel ?? "本周已完成"}</strong></div></article>
            <article className="icon-stat-card"><span className="emoji-mark" aria-hidden="true">🎯</span><div><span>当前重点</span><strong>{nextPendingDay?.focus ?? "等待下周更新"}</strong></div></article>
            <article className="icon-stat-card"><span className="emoji-mark" aria-hidden="true">✨</span><div><span>AI 已应用</span><strong>{appliedPlan ? "是" : "否"}</strong></div></article>
          </div>
        </section>
      </Reveal>

      {appliedPlan ? (
        <Reveal delay={140}>
          <section className="panel member-section">
          <div className="panel-header">
            <div>
              <p className="eyebrow">最近一次已应用</p>
              <h2>{appliedPlan.title}</h2>
            </div>
            <span className="badge-accent">已保存</span>
          </div>
          <div className="member-reading-flow">
            <article className="assistant-summary-card">
              <p>{appliedPlan.summary}</p>
              <span className="helper-text">应用时间：{appliedPlan.appliedAt.replace("T", " ").slice(0, 16)}</span>
            </article>
            {appliedPlan.highlights.length ? (
              <div className="bullet-stack">
                <div className="section-caption">本次调整重点</div>
                {appliedPlan.highlights.map((item) => (
                  <div className="bullet-card bullet-card-lift" key={item}>
                    <p>{item}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          </section>
        </Reveal>
      ) : null}

      <Reveal delay={200}>
        <section className="panel member-section">
        <div className="panel-header">
          <div>
            <p className="eyebrow">当前计划</p>
            <h2>按顺序完成，不需要来回查找</h2>
          </div>
        </div>
        <div className="schedule-table">
          {weeklyPlan.days.map((day) => (
            <div className={day.completed ? "schedule-row schedule-row-interactive schedule-row-glow" : "schedule-row schedule-row-interactive"} key={day.id}>
              <div>
                <strong>{day.dayLabel}</strong>
                <p>{day.focus}</p>
              </div>
              <div>{day.duration}</div>
              <div>{day.intensity}</div>
              <div>{day.coachNote}</div>
              <div className="row-actions">
                <button
                  className={day.completed ? "button-secondary compact" : "button-primary compact"}
                  disabled={isSaving}
                  onClick={() => void togglePlanDay(day.id)}
                  type="button"
                >
                  {day.completed ? "取消完成" : "标记完成"}
                </button>
              </div>
            </div>
          ))}
        </div>
        </section>
      </Reveal>

      <Reveal delay={260}>
        <section className="panel member-section">
        <div className="panel-header">
          <div>
            <p className="eyebrow">配套建议</p>
            <h2>先做到简单、稳定、能执行</h2>
          </div>
          <Link className="button-secondary compact" href="/member/assistant">
            让 AI 重新生成建议
          </Link>
        </div>
        <div className="member-reading-flow">
          <div className="bullet-stack">
            <div className="section-caption">简化饮食建议</div>
            {nutritionHints.map((item) => (
              <div className="bullet-card" key={item.title}>
                <strong>{item.title}</strong>
                <p>{item.body}</p>
              </div>
            ))}
          </div>

          {coachEdits.length ? (
            <div className="bullet-stack">
              <div className="section-caption">教练最近调整说明</div>
              {coachEdits.map((edit) => (
                <article className="edit-card" key={edit.id}>
                  <div className="edit-head">
                    <strong>{edit.exercise}</strong>
                    <span className="badge-accent">{edit.editor}</span>
                  </div>
                  <p><span className="label-inline">调整后：</span>{edit.coachVersion}</p>
                  <p><span className="label-inline">修改理由：</span>{edit.reason}</p>
                </article>
              ))}
            </div>
          ) : null}
        </div>
        </section>
      </Reveal>
    </MainLayout>
  );
}
