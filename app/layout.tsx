import type { Metadata, Viewport } from "next";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

const APP_VERSION = "v0.10.2";
const BUILD_ID = "2026-06-24-v0102";
const DEPLOY_LABEL = "mood-editorial-mobile-fix";

export const metadata: Metadata = {
  title: "読む棚｜今日も、いい文章と出会おう。",
  description: "AIが毎日あなたのために小さな本棚をつくる、新しい読書キュレーションサービス。",
  applicationName: "読む棚",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "読む棚",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#DDF3FF",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>
        <div className="fixed left-2 top-2 z-[60] rounded-full border border-[#2F9FE8]/25 bg-white/85 px-3 py-1 text-[11px] font-black text-[#0E4A7B] shadow-sm backdrop-blur">
          読む棚 {APP_VERSION} / {DEPLOY_LABEL} / {BUILD_ID}
        </div>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
