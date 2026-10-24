"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Dict } from "@/dictionaries/jp";
import type { Lang } from "@/lib/i18n";
import { login, signup, type AuthState } from "../actions";

export function AuthForms({ lang, next, t }: { lang: Lang; next: string; t: Dict["h2"]["login"] }) {
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [loginState, loginAction, loginPending] = useActionState<AuthState, FormData>(login, {});
  const [signupState, signupAction, signupPending] = useActionState<AuthState, FormData>(signup, {});
  const isSignup = mode === "signup";
  const error = isSignup ? signupState.error : loginState.error;

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
              <Input id="name" name="name" autoComplete="name" placeholder={t.namePlaceholder} required />
            </Field>
            <Field id="birth_year" label={t.birthYear}>
              <Input id="birth_year" name="birth_year" type="number" inputMode="numeric" min={1920} max={2010} placeholder="1997" />
            </Field>
          </>
        )}
        <Field id="email" label={t.email}>
          <Input id="email" name="email" type="email" autoComplete="email" required />
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
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <Button type="submit" size="lg" disabled={isSignup ? signupPending : loginPending}>
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
