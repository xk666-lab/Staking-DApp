import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "量子质押平台",
  description: "质押您的代币并在我们的量子质押协议中赚取奖励",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
