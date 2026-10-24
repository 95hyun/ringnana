import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LANG, isLang } from "@/lib/i18n";

// 언어 구간 없는 경로 → /jp/... (docs/i18n.md). /api·/dev·정적 파일은 matcher에서 제외
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const first = pathname.split("/")[1] ?? "";
  if (isLang(first)) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = pathname === "/" ? `/${DEFAULT_LANG}` : `/${DEFAULT_LANG}${pathname}`;
  url.search = search;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!(?:api|dev)(?:/|$)|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
