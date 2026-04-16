"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { adminNavigation, coachNavigation } from "@/lib/mock-data";
import { useDemo } from "@/lib/demo-store";
import type { Role } from "@/lib/demo-types";

type StaffLayoutProps = {
  children: ReactNode;
  currentPath: string;
  role: Extract<Role, "coach" | "admin">;
};

export function StaffLayout({ children, currentPath, role }: StaffLayoutProps) {
  const router = useRouter();
  const {
    state: { session, memberProfile, coachQueue },
    logout,
    isSaving,
  } = useDemo();
  const nav = role === "coach" ? coachNavigation : adminNavigation;

  return (
    <div className="staff-shell">
      <aside className="staff-sidebar">
        <div className="staff-brand">
          <p className="mini-label">PulseLab Console</p>
          <strong>{role === "coach" ? "Coach Workspace" : "Admin Workspace"}</strong>
          <p>
            {session.displayName ?? "未登录"} · 当前查看 {memberProfile.memberName}
          </p>
        </div>

        <nav className="nav-list" aria-label="Staff">
          {nav.map((item) => (
            <a className={item.href === currentPath ? "nav-item nav-item-active" : "nav-item"} href={item.href} key={item.href}>
              <span>{item.label}</span>
              <small>{item.description}</small>
            </a>
          ))}
        </nav>

        <div className="profile-card">
          <span className="mini-label">待处理事项</span>
          <strong>{coachQueue.length}</strong>
          <p>最近复盘和计划修改会自动进入队列。</p>
        </div>

        <button
          className="button-tertiary"
          disabled={isSaving}
          onClick={() => {
            void logout().then(() => router.push("/login"));
          }}
          type="button"
        >
          退出登录
        </button>
      </aside>

      <main className="staff-main">{children}</main>
    </div>
  );
}
