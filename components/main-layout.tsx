import { ReactNode } from "react";

type MainLayoutProps = {
  children: ReactNode;
};

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="member-app-shell member-app-shell-simple">
      <header className="member-mobile-topbar">
        <div className="member-mobile-topbar-title">
          <strong>PulseLab</strong>
          <span>训练助理</span>
        </div>
      </header>
      <main className="app-main member-app-main">{children}</main>
    </div>
  );
}
