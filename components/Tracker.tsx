"use client";
import { useMemo, useOptimistic, useRef, useState, useTransition } from "react";
import { addApplication, removeApplication, setStatus, signOut } from "@/app/actions";
import { STATUSES, type App, type Status } from "@/lib/types";
import ImportSheet from "./ImportSheet";

const PILL: Record<Status, string> = {
  saved: "bg-slate-200 text-slate-800", applied: "bg-sky-100 text-sky-900", interview: "bg-amber-100 text-amber-900",
  offer: "bg-emerald-100 text-emerald-900", rejected: "bg-rose-100 text-rose-900",
};
const field = "rounded border border-line bg-white px-3 py-2";

export default function Tracker({ initial, email }: { initial: App[]; email: string }) {
  const [rows, patch] = useOptimistic(initial, (s, a: { id: string; status: Status }) =>
    s.map((r) => (r.id === a.id ? { ...r, status: a.status } : r)));
  const [, start] = useTransition();
  const [q, setQ] = useState("");
  const [f, setF] = useState<Status | "all">("all");
  const form = useRef<HTMLFormElement>(null);
  const [err, setErr] = useState("");

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    STATUSES.forEach((s) => (c[s] = 0));
    rows.forEach((r) => c[r.status]++);
    return c;
  }, [rows]);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter((r) => (f === "all" || r.status === f) &&
      (!t || `${r.company} ${r.role} ${r.location ?? ""}`.toLowerCase().includes(t)));
  }, [rows, q, f]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex items-end justify-between gap-4">
        <h1 className="font-display text-3xl font-bold tracking-tight">Job Tracker</h1>
        <form action={signOut} className="flex items-center gap-3 text-sm text-slate-600">
          <span className="hidden sm:inline">{email}</span>
          <button className="underline">Sign out</button>
        </form>
      </header>

      <div role="tablist" className="mb-4 grid grid-cols-3 gap-px overflow-hidden rounded border border-line bg-line sm:grid-cols-6">
        {(["all", ...STATUSES] as const).map((s) => (
          <button key={s} role="tab" aria-selected={f === s} onClick={() => setF(s)}
            className={`px-3 py-3 text-left ${f === s ? "bg-ink text-white" : "bg-white hover:bg-slate-50"}`}>
            <span className="block font-display text-2xl font-bold">{counts[s]}</span>
            <span className="text-sm capitalize">{s}</span>
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search company, role, location" className={`${field} min-w-64 flex-1`} />
        <ImportSheet />
      </div>

      <details className="mb-4 rounded border border-line bg-white p-4">
        <summary className="cursor-pointer font-medium">Add an application</summary>
        <form ref={form} action={async (fd) => { const r = await addApplication(fd); setErr(r.error ?? ""); if (!r.error) form.current?.reset(); }} className="mt-4 grid gap-3 sm:grid-cols-3">
          <input name="company" required placeholder="Company" className={field} />
          <input name="role" required placeholder="Role" className={field} />
          <select name="status" defaultValue="applied" className={`${field} capitalize`}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
          <input name="location" placeholder="Location" className={field} />
          <input name="url" type="url" placeholder="Posting URL" className={field} />
          <input name="applied_on" type="date" className={field} />
          <input name="notes" placeholder="Notes" className={`${field} sm:col-span-2`} />
          <button className="rounded bg-accent px-3 py-2 font-medium text-white">Save application</button>
          {err && <p role="alert" className="text-sm text-rose-700 sm:col-span-3">{err}</p>}
        </form>
      </details>

      {shown.length === 0 ? (
        <p className="rounded border border-dashed border-line p-8 text-center text-slate-600">
          {rows.length ? "Nothing matches this filter." : "No applications yet. Add one above, or import a sheet."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded border border-line bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-line bg-slate-50 text-slate-600">
              <tr><th className="p-3">Company</th><th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3">Applied</th><th className="p-3">Location</th><th className="p-3" /></tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-0">
                  <td className="p-3 font-medium">{r.company}</td>
                  <td className="p-3">{r.url ? <a href={r.url} target="_blank" rel="noreferrer" className="text-accent underline">{r.role}</a> : r.role}</td>
                  <td className="p-3">
                    <select aria-label={`Status for ${r.company}`} value={r.status} className={`rounded px-2 py-1 capitalize ${PILL[r.status]}`}
                      onChange={(e) => { const status = e.target.value as Status; start(async () => { patch({ id: r.id, status }); await setStatus(r.id, status); }); }}>
                      {STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="p-3 tabular-nums">{r.applied_on ?? "—"}</td>
                  <td className="p-3">{r.location ?? "—"}</td>
                  <td className="p-3 text-right">
                    <button onClick={() => confirm(`Delete ${r.company}?`) && start(() => removeApplication(r.id))} className="text-rose-700 underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
