import type { Metadata, Viewport } from "next";
import { I18nProvider } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: "YUNI 训练助理",
  description: "YUNI Training Assistant",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
