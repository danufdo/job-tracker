import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/fetchAll";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Col = { header: string; key: string; width: number; kind?: "date" | "number" };
type Row = Record<string, string | number | null>;

// Headers match what the importer recognises, so an exported file can be re-imported as is.
const COLUMNS: Col[] = [
  { header: "Company", key: "company", width: 28 },
  { header: "Role", key: "role", width: 32 },
  { header: "Status", key: "status", width: 12 },
  { header: "Applied", key: "applied_on", width: 12, kind: "date" },
  { header: "Location", key: "location", width: 20 },
  { header: "URL", key: "url", width: 40 },
  { header: "Source", key: "source", width: 16 },
  { header: "Offer Min", key: "offer_min", width: 14, kind: "number" },
  { header: "Offer Max", key: "offer_max", width: 14, kind: "number" },
  { header: "Currency", key: "offer_currency", width: 10 },
  { header: "Package", key: "offer_details", width: 36 },
  { header: "Notes", key: "notes", width: 50 },
];

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function fetchRows(supabase: Supabase): Promise<Row[]> {
  return fetchAll<Row>((from, to) => supabase
    .from("applications")
    .select(COLUMNS.map((c) => c.key).join(","))
    .order("applied_on", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .order("id")
    .range(from, to) as unknown as PromiseLike<{ data: Row[] | null; error: { message: string } | null }>);
}

const quote = (s: string) => (/[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
// Stops spreadsheet apps from running text that starts with = + - @ as a formula. The importer strips this mark.
const defuse = (s: string) => (/^[=+\-@\t\r]/.test(s) ? `'${s}` : s);

function toCsv(rows: Row[]) {
  const lines = [COLUMNS.map((c) => c.header).join(",")];
  for (const r of rows) {
    lines.push(COLUMNS.map((c) => {
      const v = r[c.key];
      if (v === null || v === undefined || v === "") return "";
      return c.kind === "number" ? String(Number(v)) : quote(defuse(String(v)));
    }).join(","));
  }
  return "\uFEFF" + lines.join("\r\n") + "\r\n"; // BOM so Excel reads UTF-8 correctly
}

async function toXlsx(rows: Row[]) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Applications", { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = COLUMNS.map((c) => ({ header: c.header, key: c.key, width: c.width }));
  ws.getRow(1).font = { bold: true };
  for (const r of rows) {
    ws.addRow(Object.fromEntries(COLUMNS.map((c) => {
      const v = r[c.key];
      if (v === null || v === undefined || v === "") return [c.key, null];
      if (c.kind === "date") { const [y, m, d] = String(v).split("-").map(Number); return [c.key, new Date(Date.UTC(y, m - 1, d))]; }
      return [c.key, c.kind === "number" ? Number(v) : String(v)];
    })));
  }
  COLUMNS.forEach((c, i) => {
    if (c.kind === "date") ws.getColumn(i + 1).numFmt = "yyyy-mm-dd";
    if (c.kind === "number") ws.getColumn(i + 1).numFmt = "#,##0";
  });
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLUMNS.length } };
  return new Uint8Array(await wb.xlsx.writeBuffer());
}

export async function GET(req: Request) {
  const format = new URL(req.url).searchParams.get("format") === "xlsx" ? "xlsx" : "csv";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  let rows: Row[];
  try { rows = await fetchRows(supabase); } catch { return new Response("Export failed", { status: 500 }); }

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(format === "xlsx" ? await toXlsx(rows) : toCsv(rows), {
    headers: {
      "Content-Type": format === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="job-tracker-${stamp}.${format}"`,
      "Cache-Control": "no-store",
    },
  });
}
