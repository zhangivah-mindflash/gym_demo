"use client";

import { useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { StaffLayout } from "@/components/staff-layout";
import { useDemo } from "@/lib/demo-store";

export default function CoachReviewDetailPage() {
  const params = useParams<{ reviewId: string }>();
  const router = useRouter();
  const {
    state: { session, reviews },
    isBootstrapped,
  } = useDemo();
  const review = useMemo(() => reviews.find((item) => item.id === params.reviewId), [params.reviewId, reviews]);

  useEffect(() => {
    if (!isBootstrapped) return;
    if (!session.isAuthenticated) router.replace("/login");
    if (session.role && session.role !== "coach") router.replace(`/${session.role}`);
  }, [isBootstrapped, session.isAuthenticated, session.role, router]);

  if (!review) {
    return <StaffLayout currentPath="/coach/reviews" role="coach"><section className="panel"><div className="empty-state">未找到对应复盘记录。</div></section></StaffLayout>;
  }

  return (
    <StaffLayout currentPath="/coach/reviews" role="coach">
      <section className="staff-header">
        <div>
          <p className="eyebrow">复盘详情</p>
          <h1>{review.memberName}</h1>
          <p>独立详情页用于展示复盘计算结果、风险级别和调整逻辑。</p>
        </div>
      </section>

      <section className="staff-grid">
        <article className="panel"><h2>完成率</h2><p>{review.completedSessions} / {review.totalSessions}</p></article>
        <article className="panel"><h2>疲劳评分</h2><p>{review.fatigueScore} / 10</p></article>
        <article className="panel"><h2>风险等级</h2><p>{review.riskLevel}</p></article>
      </section>

      <section className="staff-grid-two">
        <article className="panel">
          <h2>复盘详情</h2>
          <div className="timeline">
            <div className="timeline-item"><strong>会员备注</strong><p>{review.note}</p></div>
            <div className="timeline-item"><strong>调整逻辑</strong><p>{review.nextAdjustment}</p></div>
            <div className="timeline-item"><strong>门店 / 教练</strong><p>{review.locationName} · {review.coachName}</p></div>
          </div>
        </article>
      </section>
    </StaffLayout>
  );
}
