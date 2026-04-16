"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { StaffLayout } from "@/components/staff-layout";
import { useDemo } from "@/lib/demo-store";

const PAGE_SIZE = 4;

export default function CoachReviewsPage() {
  const {
    state: { session, reviews },
    isBootstrapped,
  } = useDemo();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [risk, setRisk] = useState("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!isBootstrapped) return;
    if (!session.isAuthenticated) router.replace("/login");
    if (session.role && session.role !== "coach") router.replace(`/${session.role}`);
  }, [isBootstrapped, session.isAuthenticated, session.role, router]);

  const filtered = useMemo(() => {
    return reviews.filter((review) => {
      const byQuery = [review.memberName, review.note, review.locationName].join(" ").toLowerCase().includes(query.toLowerCase());
      const byRisk = risk === "all" || review.riskLevel === risk;
      return byQuery && byRisk;
    });
  }, [query, reviews, risk]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [query, risk]);

  return (
    <StaffLayout currentPath="/coach/reviews" role="coach">
      <section className="staff-header">
        <div>
          <p className="eyebrow">复盘列表</p>
          <h1>筛选与详情</h1>
          <p>复盘已经拆成独立列表页和详情页，可按风险级别和关键词筛选。</p>
        </div>
      </section>

      <section className="panel">
        <div className="toolbar">
          <input className="toolbar-input" placeholder="搜索会员、备注、门店" value={query} onChange={(event) => setQuery(event.target.value)} />
          <select className="toolbar-select" value={risk} onChange={(event) => setRisk(event.target.value)}>
            <option value="all">全部风险</option>
            <option value="normal">normal</option>
            <option value="watch">watch</option>
            <option value="high">high</option>
          </select>
        </div>
      </section>

      <section className="panel">
        <div className="config-list">
          {pageItems.length ? (
            pageItems.map((review) => (
              <a className="config-row" href={`/coach/reviews/${review.id}`} key={review.id}>
                <div><strong>{review.memberName}</strong><p>{review.locationName} · {review.note}</p></div>
                <div className="config-meta"><span>{review.coachName}</span><span className="badge-accent">{review.riskLevel}</span></div>
              </a>
            ))
          ) : (
            <div className="empty-state">当前筛选条件下没有复盘记录。</div>
          )}
        </div>
        <div className="pagination">
          <button className="button-secondary compact" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} type="button">上一页</button>
          <span>第 {page} / {totalPages} 页</span>
          <button className="button-secondary compact" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)} type="button">下一页</button>
        </div>
      </section>
    </StaffLayout>
  );
}
