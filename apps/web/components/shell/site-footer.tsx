import Link from "next/link";
import { getDict, href, type Lang } from "@/lib/i18n";

// 공통 푸터 — 운영 주체·문의·약관 링크 (docs/ux-review.md B2). 값은 가상
export async function SiteFooter({ lang }: { lang: Lang }) {
  const { legal } = await getDict(lang);
  const f = legal.footer;
  return (
    <footer className="mt-auto border-t bg-muted/60 px-4 py-5 text-[11px] leading-relaxed text-muted-foreground" data-site-footer>
      <nav className="mb-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
        <Link href={href(lang, "/legal/terms")} className="hover:text-foreground">{f.terms}</Link>
        <Link href={href(lang, "/legal/privacy")} className="font-semibold hover:text-foreground">{f.privacy}</Link>
        <Link href={href(lang, "/legal/tokushoho")} className="hover:text-foreground">{f.tokushoho}</Link>
      </nav>
      <p>{f.operator}</p>
      <p>{f.registration}</p>
      <p>{f.partner}</p>
      <p>
        {f.contact}: <a href={`mailto:${f.contactEmail}`} className="underline">{f.contactEmail}</a>
      </p>
    </footer>
  );
}
