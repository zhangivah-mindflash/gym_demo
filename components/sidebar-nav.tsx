"use client";

import { useRouter } from "next/navigation";
import { memberNavigation } from "@/lib/mock-data";
import { useDemo } from "@/lib/demo-store";

type SidebarNavProps = {
  currentPath: string;
};

export function SidebarNav({ currentPath }: SidebarNavProps) {
  const router = useRouter();
  const {
    state: { memberProfile, session },
    logout,
    isSaving,
  } = useDemo();

  return (
    <aside className="sidebar">
      <div className="brand-block">
        <p className="brand-kicker">PulseLab Studio</p>
        <strong>Training Space</strong>
        <span>你的训练与恢复安排</span>
      </div>

      <div className="profile-card">
        <span className="mini-label">登录身份</span>
        <strong>{session.displayName ?? "未登录"}</strong>
        <p>
          {memberProfile.locationName} · {memberProfile.coachName}
        </p>
      </div>

      <nav className="nav-list" aria-label="Member">
        {memberNavigation.map((item) => (
          <a className={item.href === currentPath ? "nav-item nav-item-active" : "nav-item"} href={item.href} key={item.href}>
            <span>{item.label}</span>
            <small>{item.description}</small>
          </a>
        ))}
      </nav>

      <div className="sidebar-footer">
        <span className="mini-label">穿戴设备</span>
        <strong>{memberProfile.wearablePermissionStatus}</strong>
        <p>接入后会用于补充训练记录与恢复判断。</p>
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
      </div>
    </aside>
  );
}
