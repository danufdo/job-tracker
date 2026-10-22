"use client";
import { useRef, useState, useTransition } from "react";
import Papa from "papaparse";
import { importApplications } from "@/app/actions";
import type { NewApp } from "@/lib/types";

const norm = (v: unknown) => String(v ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
const EXACT: Record<string, string[]> = {
  company: ["company", "employer", "organization", "organisation"],
  role: ["role", "title", "position", "jobtitle"],
  status: ["status", "stage"],
  location: ["location", "city"],
  url: ["url", "link", "joburl", "posting"],
  source: ["source", "platform", "board"],
  applied_on: ["applied", "appliedon", "applieddate", "dateapplied", "date"],
  notes: ["notes", "note", "comments"],
  offer_min: ["offermin", "offerminimum", "minoffer"],
  offer_max: ["offermax", "offermaximum", "maxoffer"],
  offer_currency: ["currency", "offercurrency"],
  offer_details: ["package", "packagedetails", "offerdetails"],
};
const LOOSE: Record<string, string[]> = { company: ["company"], role: ["role", "position", "title"], status: ["status"], applied_on: ["applied"] };

function mapColumns(head: unknown[]) {
  const h = head.map(norm), idx: Record<string, number> = {}, used = new Set<number>();
  for (const key of Object.keys(EXACT)) {
    let i = h.findIndex((x, n) => !used.has(n) && EXACT[key].includes(x));
    if (i < 0 && LOOSE[key]) i = h.findIndex((x, n) => !used.has(n) && x && LOOSE[key].some((t) => x.includes(t)));
    if (i >= 0) { idx[key] = i; used.add(i); }
  }
  return idx;
}

const fmt = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
function toDate(v: unknown) {
  if (v instanceof Date) return fmt(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate());
  const s = String(v ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  return s && !isNaN(+d) ? fmt(d.getFullYear(), d.getMonth(), d.getDate()) : null;
}

function toStatus(v: unknown): NewApp["status"] {
  const s = String(v ?? "").toLowerCase();
  if (s.includes("interview")) return "interview";
  if (s.includes("offer")) return "offer";
  if (/reject|declin|no reply|ghost/.test(s)) return "rejected";
  if (/saved|wish|bookmark/.test(s)) return "saved";
  return "applied";
}

function parseSheet(rows: unknown[][]): NewApp[] | null {
  for (let h = 0; h < Math.min(rows.length, 10); h++) {
    const idx = mapColumns(rows[h]);
    if (idx.company === undefined || idx.role === undefined) continue;
    const get = (r: unknown[], k: string) => (idx[k] === undefined ? "" : r[idx[k]]);
    const txt = (r: unknown[], k: string) => String(get(r, k) ?? "").replace(/^'(?=[=+\-@])/, "").trim();
    const numCell = (r: unknown[], k: string) => {
      const v = get(r, k);
      if (v === "" || v === null || v === undefined) return null;
      const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, ""));
      return Number.isFinite(n) && n >= 0 ? n : null;
    };
    return rows.slice(h + 1).map((r) => ({
      company: txt(r, "company"), role: txt(r, "role"), status: toStatus(get(r, "status")),
      location: txt(r, "location"), url: txt(r, "url"), source: txt(r, "source"),
      applied_on: toDate(get(r, "applied_on")), notes: txt(r, "notes"),
      offer_min: numCell(r, "offer_min"), offer_max: numCell(r, "offer_max"),
      offer_currency: txt(r, "offer_currency"), offer_details: txt(r, "offer_details"),
    })).filter((r) => r.company && r.role);
  }
  return null;
}

async function readSheets(file: File): Promise<unknown[][][]> {
  if (/\.csv$/i.test(file.name)) {
    const rows = await new Promise<unknown[][]>((res, rej) =>
      Papa.parse<string[]>(file, { skipEmptyLines: true, complete: (r) => res(r.data), error: rej }));
    return [rows];
  }
  const { default: readXlsx, readSheetNames } = await import("read-excel-file");
  const names = await readSheetNames(file);
  return Promise.all(names.map((sheet) => readXlsx(file, { sheet })));
}

export default function ImportSheet({ run }: { run: (label: string, fn: () => Promise<void>) => Promise<void> }) {
  const input = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<NewApp[]>([]);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();

  async function onFile(file?: File) {
    if (input.current) input.current.value = ""; // lets the same file be chosen again
    if (!file) return;
    setMsg(""); setRows([]);
    await run("Reading file…", async () => {
    try {
      const found = (await readSheets(file)).map(parseSheet).filter((s): s is NewApp[] => s !== null);
      if (!found.length) return setMsg("Couldn’t find a header row with Company and Role columns in the first 10 rows of any sheet.");
      const all = found.flat();
      setRows(all);
      if (!all.length) setMsg("The header was found, but no rows have both a company and a role.");
    } catch { setMsg("Couldn’t read that file. Use a .csv or .xlsx exported from Google Sheets."); }
    });
  }

  function confirmImport() {
    start(() => run("Importing applications…", async () => {
      const r = await importApplications(rows);
      setMsg(r.error ? `Import stopped: ${r.error}` : `Imported ${r.added}. Skipped ${r.skipped} duplicates.`);
      setRows([]);
    }));
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <input ref={input} type="file" accept=".csv,.xlsx" onChange={(e) => onFile(e.target.files?.[0])} className="hidden" id="sheet" />
      <label htmlFor="sheet" className="cursor-pointer rounded border border-ink px-3 py-2 text-sm font-medium hover:bg-white">Import from Google Sheets (.csv / .xlsx)</label>
      {rows.length > 0 && (
        <button onClick={confirmImport} disabled={pending} className="rounded bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-60">
          {pending ? "Importing…" : `Import ${rows.length} rows`}
        </button>
      )}
      {msg && <span role="status" className="text-sm text-slate-700">{msg}</span>}
    </div>
  );
}
