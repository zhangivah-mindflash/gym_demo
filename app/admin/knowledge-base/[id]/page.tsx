"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { StaffLayout } from "@/components/staff-layout";
import { useDemo } from "@/lib/demo-store";

export default function KnowledgeBaseDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const {
    state: { session, knowledgeBase },
    updateKnowledgeBase,
    isBootstrapped,
    isSaving,
  } = useDemo();
  const entry = useMemo(() => knowledgeBase.find((item) => item.id === params.id), [knowledgeBase, params.id]);
  const [form, setForm] = useState({
    id: params.id,
    name: entry?.name ?? "",
    description: entry?.description ?? "",
    category: entry?.category ?? "",
    documents: entry?.documents ?? 0,
    enabled: entry?.enabled ?? false,
  });

  useEffect(() => {
    if (entry) {
      setForm({
        id: entry.id,
        name: entry.name,
        description: entry.description,
        category: entry.category,
        documents: entry.documents,
        enabled: entry.enabled,
      });
    }
  }, [entry]);

  useEffect(() => {
    if (!isBootstrapped) return;
    if (!session.isAuthenticated) router.replace("/login");
    if (session.role && session.role !== "admin") router.replace(`/${session.role}`);
  }, [isBootstrapped, session.isAuthenticated, session.role, router]);

  if (!entry) {
    return <StaffLayout currentPath="/admin/knowledge-base" role="admin"><section className="panel"><div className="empty-state">未找到对应知识库条目。</div></section></StaffLayout>;
  }

  return (
    <StaffLayout currentPath="/admin/knowledge-base" role="admin">
      <section className="staff-header">
        <div>
          <p className="eyebrow">知识库详情</p>
          <h1>{entry.name}</h1>
          <p>这里是独立详情页，可以直接编辑知识库元数据和启停状态。</p>
        </div>
      </section>

      <section className="panel">
        <form className="form-grid" onSubmit={(event) => { event.preventDefault(); void updateKnowledgeBase(form); }}>
          <label className="field field-wide"><span>名称</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label className="field field-wide"><span>分类</span><input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} /></label>
          <label className="field field-wide"><span>描述</span><textarea rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
          <label className="field"><span>文档数</span><input type="number" value={form.documents} onChange={(event) => setForm({ ...form, documents: Number(event.target.value) })} /></label>
          <label className="field"><span>启用状态</span><select value={String(form.enabled)} onChange={(event) => setForm({ ...form, enabled: event.target.value === "true" })}><option value="true">启用</option><option value="false">停用</option></select></label>
          <div className="submit-row field-wide"><button className="button-primary" disabled={isSaving} type="submit">保存知识库配置</button></div>
        </form>
      </section>
    </StaffLayout>
  );
}
