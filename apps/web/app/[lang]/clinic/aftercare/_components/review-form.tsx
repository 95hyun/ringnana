"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { H4Dict } from "@/app/[lang]/(patient)/quote/_components/i18n";
import { reviewCheckin } from "../actions";

export function ReviewForm({
  followupId,
  initialNote,
  reviewed,
  t,
  errors,
}: {
  followupId: string;
  initialNote: string;
  reviewed: boolean;
  t: H4Dict["clinic"]["review"];
  errors: H4Dict["clinic"]["errors"];
}) {
  const [note, setNote] = useState(initialNote);
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const res = await reviewCheckin(followupId, note);
      if (res.ok) toast.success(reviewed ? t.savedEdit : t.savedConfirm);
      else toast.error(errors[res.error]);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Textarea
          rows={6}
          value={note}
          disabled={pending}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t.placeholder}
          maxLength={2000}
        />
        <Button disabled={pending || !note.trim()} onClick={submit}>
          {pending ? t.saving : reviewed ? t.edit : t.confirm}
        </Button>
      </CardContent>
    </Card>
  );
}
