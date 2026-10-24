import { Noto_Sans_JP, Noto_Sans_KR } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "@/app/globals.css";

// 루트 레이아웃이 여럿([lang]·dev)이라 <html>·폰트·Toaster를 여기 한 곳에 둔다
const notoSansJp = Noto_Sans_JP({
  variable: "--font-sans",
  subsets: ["latin"],
});

const notoSansKr = Noto_Sans_KR({
  variable: "--font-kr",
  subsets: ["latin"],
});

export function RootHtml({ lang, children }: { lang: string; children: React.ReactNode }) {
  return (
    <html lang={lang} className={`${notoSansJp.variable} ${notoSansKr.variable} h-full antialiased`}>
      <body className={`min-h-full flex flex-col ${lang === "ko" ? "font-[family-name:var(--font-kr)]" : ""}`}>
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
