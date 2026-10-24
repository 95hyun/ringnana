import { notFound } from "next/navigation";
import { ClinicShell } from "@/components/shell/clinic-shell";
import { isLang } from "@/lib/i18n";

export default async function ClinicLayout({ children, params }: LayoutProps<"/[lang]/clinic">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  return <ClinicShell lang={lang}>{children}</ClinicShell>;
}
