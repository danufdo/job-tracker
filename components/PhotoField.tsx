"use client";
import { useState } from "react";
import { removeResumePhoto, uploadResumePhoto } from "@/app/(app)/resume/actions";
import { PHOTO_ACCEPT, compressPhoto } from "@/lib/photoClient";
import { useBusy } from "./Busy";

export default function PhotoField({ hasPhoto }: { hasPhoto: boolean }) {
  const { withBusy } = useBusy();
  const [version, setVersion] = useState<string | null>(hasPhoto ? "0" : null);
  const [broken, setBroken] = useState(false);
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // lets the same file be chosen again later
    if (!file) return;
    setErr(""); setNote("");
    void withBusy("Uploading photo…", async () => {
      try {
        const blob = await compressPhoto(file);
        const fd = new FormData();
        fd.append("photo", blob, "photo.jpg");
        const r = await uploadResumePhoto(fd);
        if (r.error) { setErr(r.error); return; }
        setVersion(r.version ?? String(Date.now())); setBroken(false);
        setNote("Photo saved. Click Generate CV to add it to your PDF.");
      } catch (x) { setErr(x instanceof Error ? x.message : "Couldn’t upload that photo."); }
    });
  }

  function remove() {
    if (!confirm("Remove your CV photo?")) return;
    setErr(""); setNote("");
    void withBusy("Removing photo…", async () => {
      const r = await removeResumePhoto();
      if (r.error) { setErr(r.error); return; }
      setVersion(null); setNote("Photo removed. Click Generate CV to update your PDF.");
    });
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-4">
      <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded border border-line bg-slate-50 text-slate-400">
        {version && !broken ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/resume/photo?v=${version}`} alt="Your CV photo" onError={() => setBroken(true)} className="size-full object-cover" />
        ) : (
          <svg aria-hidden viewBox="0 0 24 24" className="size-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
          </svg>
        )}
      </div>
      <div className="grid min-w-48 flex-1 gap-1 text-sm">
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center rounded bg-ink px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent">
            {version ? "Change photo" : "Add photo"}
            <input type="file" accept={PHOTO_ACCEPT} onChange={pick} className="sr-only" />
          </label>
          {version && <button type="button" onClick={remove} className="text-rose-700 underline">Remove</button>}
        </div>
        <p className="text-slate-600">Optional. JPG, PNG or WebP, up to 10 MB. It’s cropped to a square and shrunk automatically.</p>
        {note && <p role="status" className="text-emerald-800">{note}</p>}
        {err && <p role="alert" className="text-rose-700">{err}</p>}
      </div>
    </div>
  );
}
