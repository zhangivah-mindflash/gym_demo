"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { StaffLayout } from "@/components/staff-layout";
import { useDemo } from "@/lib/demo-store";

const PAGE_SIZE = 4;

export default function KnowledgeBasePage() {
  const {
    state: { session, knowledgeBase },
    isBootstrapped,
  } = useDemo();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!isBootstrapped) return;
    if (!session.isAuthenticated) router.replace("/login");
    if (session.role && session.role !== "admin") router.replace(`/${session.role}`);
  }, [isBootstrapped, session.isAuthenticated, session.role, router]);

  const filtered = useMemo(() => {
    return knowledgeBase.filter((entry) => {
      const byQuery = [entry.name, entry.description, entry.category].join(" ").toLowerCase().includes(query.toLowerCase());
      const byStatus = status === "all" || (status === "enabled" ? entry.enabled : !entry.enabled);
      return byQuery && byStatus;
    });
  }, [knowledgeBase, query, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [query, status]);

  return (
    <StaffLayout currentPath="/admin/knowledge-base" role="admin">
      <section className="staff-header">
        <div>
          <p className="eyebrow">知识库配置</p>
          <h1>筛选、分页与详情</h1>
          <p>知识库已经拆成列表页和独立详情页，可按启用状态和关键词筛选。</p>
        </div>
      </section>

      <section className="panel">
        <div className="toolbar">
          <input className="toolbar-input" placeholder="搜索名称、分类、描述" value={query} onChange={(event) => setQuery(event.target.value)} />
          <select className="toolbar-select" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">全部状态</option>
            <option value="enabled">启用中</option>
            <option value="disabled">已停用</option>
          </select>
        </div>
      </section>

      <section className="panel">
        <div className="config-list">
          {pageItems.length ? (
            pageItems.map((entry) => (
              <a className="config-row" href={`/admin/knowledge-base/${entry.id}`} key={entry.id}>
                <div><strong>{entry.name}</strong><p>{entry.category} · {entry.description}</p></div>
                <div className="config-meta">
                  <span>{entry.documents} 篇</span>
                  <span className={entry.enabled ? "badge-accent" : "badge-neutral"}>{entry.enabled ? "启用中" : "已停用"}</span>
                </div>
              </a>
            ))
          ) : (
            <div className="empty-state">当前筛选条件下没有知识库条目。</div>
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
