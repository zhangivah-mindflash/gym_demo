"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { StaffLayout } from "@/components/staff-layout";
import { useDemo } from "@/lib/demo-store";

export default function AdminHomePage() {
  const {
    state: { session, knowledgeBase, modelSettings, members },
    isBootstrapped,
  } = useDemo();
  const router = useRouter();

  useEffect(() => {
    if (!isBootstrapped) return;
    if (!session.isAuthenticated) router.replace("/login");
    if (session.role && session.role !== "admin") router.replace(`/${session.role}`);
  }, [isBootstrapped, session.isAuthenticated, session.role, router]);

  return (
    <StaffLayout currentPath="/admin" role="admin">
      <section className="staff-header">
        <div>
          <p className="eyebrow">后台首页</p>
          <h1>系统配置概览</h1>
          <p>管理员界面偏工作台，不追求会员端的品牌气质，重点展示配置、数据和结构。</p>
        </div>
      </section>

      <section className="staff-grid">
        <article className="panel"><h2>知识库板块</h2><p>{knowledgeBase.length}</p></article>
        <article className="panel"><h2>模型配置项</h2><p>{modelSettings.length}</p></article>
        <article className="panel"><h2>会员总数</h2><p>{members.length}</p></article>
      </section>

      <section className="staff-grid-two">
        <article className="panel">
          <h2>可进入的详情页</h2>
          <div className="bullet-stack">
            <div className="bullet-card"><a href="/admin/knowledge-base">知识库配置页</a></div>
            <div className="bullet-card"><a href="/admin/model-settings">模型配置页</a></div>
            <div className="bullet-card"><a href="/admin/members">会员数据页</a></div>
          </div>
        </article>
        <article className="panel">
          <h2>说明</h2>
          <p>管理员端已经从单页聚合拆开，知识库、模型配置和会员数据都有独立入口。</p>
        </article>
      </section>
    </StaffLayout>
  );
}
