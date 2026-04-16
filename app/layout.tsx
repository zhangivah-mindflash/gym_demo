import type { Metadata } from "next";
import { DemoProvider } from "@/lib/demo-store";
import "./globals.css";

export const metadata: Metadata = {
  title: "PulseLab Fitness AI",
  description: "健身房/工作室会员体系智能健身助手 Demo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <DemoProvider>{children}</DemoProvider>
      </body>
    </html>
  );
}
