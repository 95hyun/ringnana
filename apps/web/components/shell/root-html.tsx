import { Inter, Noto_Sans_JP, Noto_Sans_KR } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "@/app/globals.css";

// 루트 레이아웃이 여럿([lang]·dev)이라 <html>·폰트·Toaster를 여기 한 곳에 둔다
// 폰트 (docs/design.md §3): 영문·숫자 Inter, 일본어 Noto Sans JP. 한국어 화면(ko)은 Noto Sans KR로 한글을 받친다
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], weight: ["400", "500", "600"] });
const notoSansJp = Noto_Sans_JP({ variable: "--font-jp", subsets: ["latin"], weight: ["400", "500", "600"] });
const notoSansKr = Noto_Sans_KR({ variable: "--font-kr", subsets: ["latin"], weight: ["400", "500", "600"] });

export function RootHtml({ lang, children }: { lang: string; children: React.ReactNode }) {
  return (
    <html lang={lang} className={`${inter.variable} ${notoSansJp.variable} ${notoSansKr.variable} h-full antialiased`}>
      <body className={`flex min-h-full flex-col ${lang === "ko" ? "font-ko" : "font-sans"}`}>
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
