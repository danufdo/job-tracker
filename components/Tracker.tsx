"use client";
import { Fragment, useMemo, useOptimistic, useRef, useState, useTransition } from "react";
import { addApplication, deleteAccount, removeApplication, updateApplication, setStatus, signOut } from "@/app/actions";
import { STATUSES, type App, type Status } from "@/lib/types";
import ImportSheet from "./ImportSheet";

const PILL: Record<Status, string> = {
  saved: "bg-slate-200 text-slate-800", applied: "bg-sky-100 text-sky-900", interview: "bg-amber-100 text-amber-900",
  offer: "bg-emerald-100 text-emerald-900", rejected: "bg-rose-100 text-rose-900",
};
const field = "rounded border border-line bg-white px-3 py-2";
const SIZES = [10, 25, 50, 100];
const btn = "inline-flex items-center gap-2 rounded bg-ink px-3 py-2 text-sm font-medium text-white hover:bg-slate-700";

function DownloadIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12" /><path d="m7 11 5 5 5-5" /><path d="M5 21h14" />
    </svg>
  );
}
const money = (n: number) => n.toLocaleString("en-US");
function offerText(r: App) {
  const c = r.offer_currency ? `${r.offer_currency} ` : "";
  if (r.offer_min != null && r.offer_max != null && r.offer_min !== r.offer_max) return `${c}${money(r.offer_min)}–${money(r.offer_max)}`;
  const one = r.offer_min ?? r.offer_max;
  return one != null ? `${c}${money(one)}` : null;
}

function Field({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return <label className={`grid gap-1 text-sm text-slate-700 ${className}`}><span>{label}</span>{children}</label>;
}

export default function Tracker({ initial, email }: { initial: App[]; email: string }) {
  const [rows, patch] = useOptimistic(initial, (s, a: { id: string; status: Status }) =>
    s.map((r) => (r.id === a.id ? { ...r, status: a.status } : r)));
  const [, start] = useTransition();
  const [q, setQ] = useState("");
  const [f, setF] = useState<Status | "all">("all");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(25);
  const form = useRef<HTMLFormElement>(null);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [derr, setDerr] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [fail, setFail] = useState("");
  const [delText, setDelText] = useState("");
  const [delErr, setDelErr] = useState("");

  // Shows the loading screen (and locks the page) while a save, edit, delete or import runs.
  async function withBusy(label: string, fn: () => Promise<void>) {
    setFail(""); setBusy(label);
    try { await fn(); } catch { setFail("Something went wrong. Please try again."); } finally { setBusy(null); }
  }

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

  const pages = Math.max(1, Math.ceil(shown.length / size));
  const cur = Math.min(page, pages - 1);
  const visible = shown.slice(cur * size, cur * size + size);

  return (
    <>
    <main inert={busy !== null} className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex items-end justify-between gap-4">
        <h1 className="font-display text-3xl font-bold tracking-tight">Job Tracker</h1>
        <form action={() => { setBusy("Signing out…"); return signOut(); }} className="flex items-center gap-3 text-sm text-slate-600">
          <span className="hidden sm:inline">{email}</span>
          <button className="underline">Sign out</button>
        </form>
      </header>

      {fail && <p role="alert" className="mb-4 rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{fail}</p>}

      <div role="tablist" className="mb-4 grid grid-cols-3 gap-px overflow-hidden rounded border border-line bg-line sm:grid-cols-6">
        {(["all", ...STATUSES] as const).map((s) => (
          <button key={s} role="tab" aria-selected={f === s} onClick={() => { setF(s); setPage(0); }}
            className={`px-3 py-3 text-left ${f === s ? "bg-ink text-white" : "bg-white hover:bg-slate-50"}`}>
            <span className="block font-display text-2xl font-bold">{counts[s]}</span>
            <span className="text-sm capitalize">{s}</span>
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search company, role, location" className={`${field} min-w-64 flex-1`} />
        <ImportSheet run={withBusy} />
        <a href="/api/export?format=xlsx" download className={btn}><DownloadIcon />Export Excel</a>
        <a href="/api/export?format=csv" download className={btn}><DownloadIcon />Export CSV</a>
      </div>

      <details className="mb-4 rounded border border-line bg-white p-4">
        <summary className="cursor-pointer font-medium">Add an application</summary>
        <form ref={form} action={(fd) => withBusy("Saving application…", async () => { const r = await addApplication(fd); setErr(r.error ?? ""); if (!r.error) form.current?.reset(); })} className="mt-4 grid gap-3 sm:grid-cols-3">
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
              <tr><th className="p-3">Company</th><th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3">Applied</th><th className="p-3">Location</th><th className="p-3">Offer</th><th className="p-3" /></tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <Fragment key={r.id}>
                  <tr className="border-b border-line last:border-0">
                  <td className="p-3 font-medium">{r.company}</td>
                  <td className="p-3">{r.url ? <a href={r.url} target="_blank" rel="noreferrer" className="text-accent underline">{r.role}</a> : r.role}</td>
                  <td className="p-3">
                    <select aria-label={`Status for ${r.company}`} value={r.status} disabled={open === r.id} className={`rounded px-2 py-1 capitalize ${PILL[r.status]}`}
                      onChange={(e) => { const status = e.target.value as Status; start(() => withBusy("Updating status…", async () => { patch({ id: r.id, status }); await setStatus(r.id, status); })); }}>
                      {STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="p-3 tabular-nums">{r.applied_on ?? "—"}</td>
                  <td className="p-3">{r.location ?? "—"}</td>
                  <td className="p-3">
                    {offerText(r) ?? "—"}
                    {r.offer_details && <div title={r.offer_details} className="max-w-48 truncate text-xs text-slate-600">{r.offer_details}</div>}
                  </td>
                  <td className="space-x-3 whitespace-nowrap p-3 text-right">
                    <button onClick={() => { setDerr(""); setOpen(open === r.id ? null : r.id); }} aria-expanded={open === r.id} className="text-accent underline">
                      {open === r.id ? "Close" : r.notes ? "Edit •" : "Edit"}
                    </button>
                    <button onClick={() => confirm(`Delete ${r.company}?`) && start(() => withBusy("Deleting application…", () => removeApplication(r.id)))} className="text-rose-700 underline">Delete</button>
                  </td>
                </tr>
                  {open === r.id && (
                    <tr className="border-b border-line bg-slate-50">
                      <td colSpan={7} className="p-4">
                        <form action={(fd) => withBusy("Saving changes…", async () => { const res = await updateApplication(r.id, fd); setDerr(res.error ?? ""); if (!res.error) setOpen(null); })} className="grid gap-4 sm:grid-cols-6">
                          <Field label="Company" className="sm:col-span-2"><input name="company" required maxLength={200} defaultValue={r.company} className={field} /></Field>
                          <Field label="Role" className="sm:col-span-2"><input name="role" required maxLength={200} defaultValue={r.role} className={field} /></Field>
                          <Field label="Status" className="sm:col-span-2">
                            <select name="status" defaultValue={r.status} className={`${field} capitalize`}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
                          </Field>
                          <Field label="Location" className="sm:col-span-2"><input name="location" maxLength={200} defaultValue={r.location ?? ""} className={field} /></Field>
                          <Field label="Applied date" className="sm:col-span-2"><input name="applied_on" type="date" defaultValue={r.applied_on ?? ""} className={field} /></Field>
                          <Field label="Posting URL" className="sm:col-span-2"><input name="url" type="url" defaultValue={r.url ?? ""} placeholder="https://…" className={field} /></Field>
                          <fieldset className="grid gap-3 sm:col-span-6 sm:grid-cols-6">
                            <legend className="mb-2 text-sm font-medium">Offer</legend>
                            <Field label="Minimum" className="sm:col-span-2"><input name="offer_min" type="number" min="0" step="any" defaultValue={r.offer_min ?? ""} className={field} /></Field>
                            <Field label="Maximum" className="sm:col-span-2"><input name="offer_max" type="number" min="0" step="any" defaultValue={r.offer_max ?? ""} className={field} /></Field>
                            <Field label="Currency" className="sm:col-span-2"><input name="offer_currency" maxLength={8} defaultValue={r.offer_currency ?? ""} placeholder="e.g. LKR" className={field} /></Field>
                            <Field label="Package details" className="sm:col-span-6"><input name="offer_details" defaultValue={r.offer_details ?? ""} placeholder="Bonus, benefits, equity…" className={field} /></Field>
                          </fieldset>
                          <Field label="Notes" className="sm:col-span-6"><textarea name="notes" rows={4} defaultValue={r.notes ?? ""} className={field} /></Field>
                          <div className="flex flex-wrap items-center gap-3 sm:col-span-6">
                            <button className="rounded bg-accent px-3 py-2 font-medium text-white">Save changes</button>
                            <button type="button" onClick={() => setOpen(null)} className="underline">Cancel</button>
                            {derr && <p role="alert" className="text-sm text-rose-700">{derr}</p>}
                          </div>
                        </form>
                      </td>
                    </tr>
                  )}
                  </Fragment>
                ))}
              </tbody>
          </table>
        </div>
      )}

      {shown.length > 0 && (
        <nav aria-label="Pagination" className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="tabular-nums text-slate-600">{cur * size + 1}–{Math.min((cur + 1) * size, shown.length)} of {shown.length}</span>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-slate-600">Rows per page
              <select value={size} onChange={(e) => { setSize(Number(e.target.value)); setPage(0); }} className="rounded border border-line bg-white px-2 py-1">
                {SIZES.map((n) => <option key={n}>{n}</option>)}
              </select>
            </label>
            <button onClick={() => setPage(cur - 1)} disabled={cur === 0} className="rounded border border-line bg-white px-3 py-1 disabled:opacity-50">Previous</button>
            <span className="tabular-nums">Page {cur + 1} of {pages}</span>
            <button onClick={() => setPage(cur + 1)} disabled={cur >= pages - 1} className="rounded border border-line bg-white px-3 py-1 disabled:opacity-50">Next</button>
          </div>
        </nav>
      )}
    
      <details className="mt-10 rounded border border-rose-200 bg-white p-4">
        <summary className="cursor-pointer font-medium text-rose-800">Delete account</summary>
        <p className="mt-3 text-sm text-slate-700">This permanently deletes your login and every application, offer and note you’ve saved. It can’t be undone.</p>
        <p className="mt-2 text-sm text-slate-700">
          Want a copy first? <a href="/api/export?format=xlsx" download className="text-accent underline">Download Excel</a> or <a href="/api/export?format=csv" download className="text-accent underline">CSV</a>.
        </p>
        <form
          action={(fd) => withBusy("Deleting your account…", async () => {
            setDelErr("");
            const r = await deleteAccount(fd);
            if (!r.done) { setDelErr(r.error ?? ""); return; }
            window.location.assign("/login?deleted=1");
            await new Promise<void>(() => {}); // keep the loading screen up until the page navigates
          })}
          className="mt-4 grid max-w-sm gap-3"
        >
          <input name="password" type="password" required autoComplete="current-password" placeholder="Your password" aria-label="Your password" className={field} />
          <input name="confirm" value={delText} onChange={(e) => setDelText(e.target.value)} autoComplete="off" placeholder="Type DELETE to confirm" aria-label="Type DELETE to confirm" className={field} />
          <button disabled={delText !== "DELETE"} className="rounded bg-rose-700 px-3 py-2 font-medium text-white disabled:opacity-50">Permanently delete my account</button>
          {delErr && <p role="alert" className="text-sm text-rose-700">{delErr}</p>}
        </form>
      </details>
    </main>

    {busy && (
      <div role="status" aria-live="assertive" className="fixed inset-0 z-50 grid place-items-center bg-ink/50">
        <div className="flex items-center gap-3 rounded bg-white px-5 py-4 shadow-lg">
          <span aria-hidden className="size-5 animate-spin rounded-full border-2 border-line border-t-accent" />
          <span className="font-medium">{busy}</span>
        </div>
      </div>
    )}
    </>
  );
}
