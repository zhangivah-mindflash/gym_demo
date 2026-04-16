"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { StaffLayout } from "@/components/staff-layout";
import { useDemo } from "@/lib/demo-store";

const PAGE_SIZE = 5;

export default function AdminMembersPage() {
  const {
    state: { session, members },
    isBootstrapped,
  } = useDemo();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!isBootstrapped) return;
    if (!session.isAuthenticated) router.replace("/login");
    if (session.role && session.role !== "admin") router.replace(`/${session.role}`);
  }, [isBootstrapped, session.isAuthenticated, session.role, router]);

  const filtered = useMemo(() => {
    return members.filter((member) => {
      const byQuery = [member.memberName, member.goalLabel, member.coachName].join(" ").toLowerCase().includes(query.toLowerCase());
      const byLocation = location === "all" || member.locationName === location;
      return byQuery && byLocation;
    });
  }, [location, members, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [query, location]);

  return (
    <StaffLayout currentPath="/admin/members" role="admin">
      <section className="staff-header">
        <div>
          <p className="eyebrow">会员数据</p>
          <h1>多会员真实列表</h1>
          <p>这里已经扩成多会员列表，可按门店和关键词筛选，并进入会员详情页。</p>
        </div>
      </section>

      <section className="panel">
        <div className="toolbar">
          <input className="toolbar-input" placeholder="搜索会员、目标、教练" value={query} onChange={(event) => setQuery(event.target.value)} />
          <select className="toolbar-select" value={location} onChange={(event) => setLocation(event.target.value)}>
            <option value="all">全部门店</option>
            {Array.from(new Set(members.map((item) => item.locationName))).map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </div>
      </section>

      <section className="panel">
        <div className="config-list">
          {pageItems.length ? (
            pageItems.map((member) => (
              <a className="config-row" href={`/admin/members/${member.id}`} key={member.id}>
                <div><strong>{member.memberName}</strong><p>{member.locationName} · {member.goalLabel}</p></div>
                <div className="config-meta"><span>{member.coachName}</span><span className="badge-outline">v{member.planVersion}</span></div>
              </a>
            ))
          ) : (
            <div className="empty-state">当前筛选条件下没有会员。</div>
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
