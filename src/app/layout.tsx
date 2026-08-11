import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  description:
    "从西部酒吧进入一个可维护、可溯源的 HUNTER×HUNTER 中文爱好者社区。",
  metadataBase: new URL("https://hunter-club-flame.vercel.app"),
  openGraph: {
    description: "推开酒吧门，与向导交谈，进入可溯源的猎人资料世界。",
    images: [
      {
        alt: "Hunter Club 猎人酒馆的原创西部酒吧夜景",
        height: 938,
        url: "/og.png",
        width: 1672,
      },
    ],
    siteName: "Hunter Club",
    title: "Hunter Club · 猎人酒馆",
    type: "website",
  },
  title: {
    default: "Hunter Club",
    template: "%s · Hunter Club",
  },
  twitter: {
    card: "summary_large_image",
    description: "推开酒吧门，与向导交谈，进入可溯源的猎人资料世界。",
    images: ["/og.png"],
    title: "Hunter Club · 猎人酒馆",
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
