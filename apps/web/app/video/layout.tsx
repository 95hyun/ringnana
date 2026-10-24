import type { Metadata } from "next";
import "./video.css";

export const metadata: Metadata = {
  title: "Ringnana ビデオ診察",
};

// /video 는 플랫폼 화면과 별도 루트 레이아웃 (어두운 통화 화면, 플랫폼 셸·폰트 없음)
export default function VideoLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="bg-neutral-950 text-neutral-50 antialiased">{children}</body>
    </html>
  );
}
