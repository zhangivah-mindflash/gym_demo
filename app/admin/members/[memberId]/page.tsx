"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { StaffLayout } from "@/components/staff-layout";
import { useDemo } from "@/lib/demo-store";

export default function AdminMemberDetailPage() {
  const params = useParams<{ memberId: string }>();
  const router = useRouter();
  const {
    state: { session, members, memberProfile, review },
    selectMember,
    isBootstrapped,
  } = useDemo();

  useEffect(() => {
    if (!isBootstrapped) return;
    if (!session.isAuthenticated) router.replace("/login");
    if (session.role && session.role !== "admin") router.replace(`/${session.role}`);
  }, [isBootstrapped, session.isAuthenticated, session.role, router]);

  useEffect(() => {
    void selectMember(params.memberId);
  }, [params.memberId, selectMember]);

  const listed = members.find((item) => item.id === params.memberId);

  if (!listed) {
    return <StaffLayout currentPath="/admin/members" role="admin"><section className="panel"><div className="empty-state">未找到该会员。</div></section></StaffLayout>;
  }

  return (
    <StaffLayout currentPath="/admin/members" role="admin">
      <section className="staff-header">
        <div>
          <p className="eyebrow">会员详情</p>
          <h1>{memberProfile.memberName}</h1>
          <p>管理员可在这里查看会员画像、当前计划版本和最近复盘情况。</p>
        </div>
      </section>

      <section className="staff-grid-two">
        <article className="panel">
          <h2>会员画像</h2>
          <div className="timeline">
            <div className="timeline-item"><strong>门店 / 教练</strong><p>{memberProfile.locationName} · {memberProfile.coachName}</p></div>
            <div className="timeline-item"><strong>目标</strong><p>{memberProfile.goalLabel}</p></div>
            <div className="timeline-item"><strong>训练等级</strong><p>{memberProfile.trainingLevel}</p></div>
            <div className="timeline-item"><strong>伤病/禁忌</strong><p>{memberProfile.injuryHistory}</p></div>
          </div>
        </article>

        <article className="panel">
          <h2>当前状态</h2>
          <div className="timeline">
            <div className="timeline-item"><strong>计划版本</strong><p>v{memberProfile.planVersion}</p></div>
            <div className="timeline-item"><strong>最近复盘风险</strong><p>{review.riskLevel}</p></div>
            <div className="timeline-item"><strong>最近复盘备注</strong><p>{review.note}</p></div>
          </div>
        </article>
      </section>
    </StaffLayout>
  );
}
