"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { H4Dict } from "../../quote/_components/i18n";
import { submitCheckin } from "../actions";
import { SYMPTOM_KEYS } from "./checkin";
import { resizeImage } from "./resize-image";

export function CheckinForm({
  followupId,
  t,
  symptoms: labels,
  errors,
}: {
  followupId: string;
  t: H4Dict["checkin"];
  symptoms: H4Dict["symptoms"];
  errors: H4Dict["errors"];
}) {
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [memo, setMemo] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    try {
      const blob = await resizeImage(file);
      setPhoto(blob);
      setPreview(URL.createObjectURL(blob));
    } catch {
      toast.error(t.badImage);
    }
  }

  function submit() {
    if (!photo) return;
    const fd = new FormData();
    fd.set("followupId", followupId);
    fd.set("photo", photo, "checkin.jpg");
    symptoms.forEach((s) => fd.append("symptoms", s));
    fd.set("memo", memo);
    startTransition(async () => {
      const res = await submitCheckin(fd);
      if (res.ok) toast.success(t.success);
      else toast.error(errors[res.error]);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{t.step1Title}</CardTitle>
          <CardDescription>{t.step1Desc}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt={t.previewAlt} className="w-full rounded-lg border object-cover" />
          )}
          <label className="flex cursor-pointer items-center justify-center rounded-lg border border-dashed px-3 py-4 text-sm hover:bg-muted">
            {preview ? t.retake : t.pick}
            <input
              type="file"
              accept="image/*"
              capture="user"
              className="sr-only"
              disabled={pending}
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.step2Title}</CardTitle>
          <CardDescription>{t.step2Desc}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {SYMPTOM_KEYS.map((key) => (
            <label key={key} className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm has-checked:border-primary">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={symptoms.includes(key)}
                disabled={pending}
                onChange={(e) => setSymptoms((cur) => (e.target.checked ? [...cur, key] : cur.filter((k) => k !== key)))}
              />
              {labels[key]}
            </label>
          ))}
          <Textarea
            placeholder={t.memoPlaceholder}
            value={memo}
            disabled={pending}
            onChange={(e) => setMemo(e.target.value)}
            maxLength={1000}
          />
        </CardContent>
      </Card>

      <Button size="lg" className="w-full" disabled={!photo || pending} onClick={submit}>
        {pending ? t.submitting : photo ? t.submit : t.needPhoto}
      </Button>
    </div>
  );
}
