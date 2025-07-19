import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegistration from "./components/ServiceWorkerRegistration";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JR高崎線運行情報",
  description: "JR東日本高崎線の運行情報通知サービス",
  manifest: "/manifest.json",
  themeColor: "#0070f3",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "JR高崎線",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "JR高崎線運行情報",
    description: "JR東日本高崎線の運行情報通知サービス",
    url: "https://example.com/jr",
    siteName: "JR高崎線運行情報",
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "JR高崎線運行情報",
    description: "JR東日本高崎線の運行情報通知サービス",
  },
  icons: {
    icon: [
      { url: "/icons/icon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/icon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}
