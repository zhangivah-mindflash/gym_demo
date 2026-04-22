"use client";

import { ReactNode } from "react";
import { LangSwitcher } from "@/components/lang-switcher";
import { useI18n } from "@/lib/i18n";

type MainLayoutProps = {
  children: ReactNode;
};

export function MainLayout({ children }: MainLayoutProps) {
  const { t } = useI18n();
  return (
    <div className="app-shell">
      <div aria-hidden className="deco-rings">
        <span className="deco-ring-inner" />
      </div>
      <header className="app-topbar">
        <div className="app-topbar-title">
          <span aria-hidden className="brand-mark" />
          <strong>{t("brand")}</strong>
        </div>
        <LangSwitcher />
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}
