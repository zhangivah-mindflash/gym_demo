import { ReactNode } from "react";

type MainLayoutProps = {
  children: ReactNode;
};

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="app-shell">
      <header className="app-topbar">
        <div className="app-topbar-title">
          <strong>训练助理</strong>
          <span>输入问题 · 生成建议</span>
        </div>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}
