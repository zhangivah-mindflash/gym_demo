"use client";

import { ReactNode, useEffect, useState } from "react";
import { SidebarNav } from "@/components/sidebar-nav";

type MainLayoutProps = {
  children: ReactNode;
  currentPath: string;
};

export function MainLayout({ children, currentPath }: MainLayoutProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [currentPath]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 961px)");
    const closeIfDesktop = () => {
      if (mq.matches) setMobileNavOpen(false);
    };
    mq.addEventListener("change", closeIfDesktop);
    closeIfDesktop();
    return () => mq.removeEventListener("change", closeIfDesktop);
  }, []);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileNavOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.classList.add("member-nav-open");
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("member-nav-open");
    };
  }, [mobileNavOpen]);

  return (
    <div className="member-app-shell">
      <header className="member-mobile-topbar">
        <button
          aria-controls="member-sidebar-nav"
          aria-expanded={mobileNavOpen}
          className="member-menu-button"
          onClick={() => setMobileNavOpen((open) => !open)}
          type="button"
        >
          <span aria-hidden="true" className="member-menu-button-bars" />
          <span className="sr-only">{mobileNavOpen ? "关闭菜单" : "打开菜单"}</span>
        </button>
        <div className="member-mobile-topbar-title">
          <strong>PulseLab</strong>
          <span>会员训练</span>
        </div>
      </header>

      {mobileNavOpen ? (
        <button
          aria-label="关闭导航菜单"
          className="member-nav-backdrop"
          onClick={() => setMobileNavOpen(false)}
          type="button"
        />
      ) : null}

      <SidebarNav
        currentPath={currentPath}
        id="member-sidebar-nav"
        mobileNavOpen={mobileNavOpen}
        onNavigate={() => setMobileNavOpen(false)}
      />
      <main className="app-main member-app-main">{children}</main>
    </div>
  );
}
