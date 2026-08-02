import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  description: "一个可维护、可溯源的 HUNTER×HUNTER 中文爱好者社区。",
  title: {
    default: "Hunter Club",
    template: "%s · Hunter Club",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
