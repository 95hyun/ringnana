"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Dict } from "@/dictionaries/jp";
import type { Lang } from "@/lib/i18n";
import { login, signup, type AuthState } from "../actions";

type LegalPaths = { terms: string; sensitive: string; transfer: string };

export function AuthForms({ lang, next, t, legalPaths }: { lang: Lang; next: string; t: Dict["h2"]["login"]; legalPaths: LegalPaths }) {
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [loginState, loginAction, loginPending] = useActionState<AuthState, FormData>(login, {});
  const [signupState, signupAction, signupPending] = useActionState<AuthState, FormData>(signup, {});
  const isSignup = mode === "signup";
  const error = isSignup ? signupState.error : loginState.error;
  // form action은 제출 후 비제어 입력을 리셋하므로, 서버가 돌려준 입력값을 defaultValue로 되살린다
  const values = (isSignup ? signupState.values : loginState.values) ?? {};
  const [consents, setConsents] = useState({ terms: false, sensitive: false, transfer: false });
  const allConsented = consents.terms && consents.sensitive && consents.transfer;
  // 실패 응답 뒤 폼이 리셋되면 체크박스 DOM도 풀리므로 상태도 같이 되돌린다 (렌더 중 이전 응답과 비교)
  const [seenState, setSeenState] = useState(signupState);
  if (seenState !== signupState) {
    setSeenState(signupState);
    if (signupState.error) setConsents({ terms: false, sensitive: false, transfer: false });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 rounded-lg bg-muted p-1 text-sm">
        {(["signup", "login"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-md py-2 font-medium ${mode === m ? "bg-background shadow-sm" : "text-muted-foreground"}`}
          >
            {m === "signup" ? t.tabSignup : t.tabLogin}
          </button>
        ))}
      </div>

      <form action={isSignup ? signupAction : loginAction} className="flex flex-col gap-4" key={mode}>
        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="lang" value={lang} />
        {isSignup && (
          <>
            <Field id="name" label={t.name}>
              <Input id="name" name="name" autoComplete="name" placeholder={t.namePlaceholder} defaultValue={values.name} required />
            </Field>
            <Field id="name_latin" label={t.nameLatin}>
              <Input
                id="name_latin"
                name="name_latin"
                autoComplete="off"
                placeholder={t.nameLatinPlaceholder}
                defaultValue={values.name_latin}
                pattern="[A-Za-z][A-Za-z \-]*"
                maxLength={60}
                lang="en"
                required
              />
              <p className="text-xs text-muted-foreground">{t.nameLatinHint}</p>
            </Field>
            <Field id="birth_year" label={t.birthYear}>
              <Input id="birth_year" name="birth_year" type="number" inputMode="numeric" min={1920} max={2010} placeholder="1997" />
            </Field>
          </>
        )}
        <Field id="email" label={t.email}>
          <Input id="email" name="email" type="email" autoComplete="email" defaultValue={values.email} required />
        </Field>
        <Field id="password" label={t.password}>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            minLength={6}
            required
          />
        </Field>
        {isSignup && (
          <fieldset className="flex flex-col gap-2 rounded-lg border p-3" data-testid="signup-consents">
            <legend className="px-1 text-sm font-medium">{t.consentTitle}</legend>
            {(
              [
                ["terms", t.consentTerms],
                ["sensitive", t.consentSensitive],
                ["transfer", t.consentTransfer],
              ] as const
            ).map(([key, text]) => (
              <label key={key} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  name={`consent_${key}`}
                  checked={consents[key]}
                  onChange={(e) => setConsents((c) => ({ ...c, [key]: e.target.checked }))}
                  className="mt-0.5 size-4 shrink-0 accent-primary"
                  required
                />
                <span>
                  {text}
                  {/* 국외 이전 조항은 개인정보처리방침 §3 (앵커 없음 — 페이지로 연결) */}
                  <a
                    href={legalPaths[key]}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-1 text-xs text-primary underline underline-offset-2"
                  >
                    {t.consentView}
                  </a>
                </span>
              </label>
            ))}
          </fieldset>
        )}
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <Button type="submit" size="lg" disabled={isSignup ? signupPending || !allConsented : loginPending}>
          {isSignup ? t.submitSignup : t.submitLogin}
        </Button>
      </form>
    </div>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
