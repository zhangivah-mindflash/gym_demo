"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { StaffLayout } from "@/components/staff-layout";
import { useDemo } from "@/lib/demo-store";

export default function CoachHomePage() {
  const {
    state: { session, coachQueue, members, review },
    isBootstrapped,
  } = useDemo();
  const router = useRouter();

  useEffect(() => {
    if (!isBootstrapped) return;
    if (!session.isAuthenticated) router.replace("/login");
    if (session.role && session.role !== "coach") router.replace(`/${session.role}`);
  }, [isBootstrapped, session.isAuthenticated, session.role, router]);

  return (
    <StaffLayout currentPath="/coach" role="coach">
      <section className="staff-header">
        <div>
          <p className="eyebrow">教练首页</p>
          <h1>会员跟进概览</h1>
          <p>教练端 UI 简化为工作台结构，重点放在计划编辑、复盘跟进和待办处理。</p>
        </div>
      </section>

      <section className="staff-grid">
        <article className="panel"><h2>管理会员</h2><p>{members.length}</p></article>
        <article className="panel"><h2>待处理任务</h2><p>{coachQueue.length}</p></article>
        <article className="panel"><h2>最高风险</h2><p>{review.riskLevel}</p></article>
      </section>

      <section className="staff-grid-two">
        <article className="panel">
          <div className="panel-header"><div><p className="eyebrow">会员列表</p><h2>最近更新</h2></div><a className="text-link" href="/coach/plans">查看全部</a></div>
          <div className="config-list">
            {members.slice(0, 5).map((member) => (
              <a className="config-row" href={`/coach/plans/${member.id}`} key={member.id}>
                <div><strong>{member.memberName}</strong><p>{member.locationName} · {member.goalLabel}</p></div>
                <span className="badge-outline">v{member.planVersion}</span>
              </a>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-header"><div><p className="eyebrow">待办队列</p><h2>最近任务</h2></div></div>
          <div className="config-list">
            {coachQueue.slice(0, 6).map((item) => (
              <div className="config-row" key={item.id}>
                <div><strong>{item.member}</strong><p>{item.location} · {item.task}</p></div>
                <span className="badge-accent">{item.status}</span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </StaffLayout>
  );
}
