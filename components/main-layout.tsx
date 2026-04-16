import { ReactNode } from "react";
import { SidebarNav } from "@/components/sidebar-nav";

type MainLayoutProps = {
  children: ReactNode;
  currentPath: string;
};

export function MainLayout({ children, currentPath }: MainLayoutProps) {
  return (
    <div className="app-shell">
      <SidebarNav currentPath={currentPath} />
      <main className="app-main">{children}</main>
    </div>
  );
}
