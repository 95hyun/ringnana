import { notFound } from "next/navigation";
import { PatientShell } from "@/components/shell/patient-shell";
import { isLang } from "@/lib/i18n";

export default async function PatientLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  return <PatientShell lang={lang}>{children}</PatientShell>;
}
