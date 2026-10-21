"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { STATUSES, type NewApp, type Status } from "@/lib/types";

const clean = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const validStatus = (v: unknown): Status => (STATUSES as readonly string[]).includes(String(v)) ? (v as Status) : "applied";
const validUrl = (v: unknown) => { const s = clean(v); return s && /^https?:\/\//i.test(s) ? s : null; };
const validDate = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

export async function addApplication(fd: FormData): Promise<{ error?: string }> {
  const company = clean(fd.get("company")), role = clean(fd.get("role"));
  if (!company || !role) return { error: "Company and role are required." };
  const supabase = await createClient();
  const { error } = await supabase.from("applications").insert({
    company, role, status: validStatus(fd.get("status")), location: clean(fd.get("location")),
    url: validUrl(fd.get("url")), applied_on: validDate(fd.get("applied_on")), notes: clean(fd.get("notes")),
  });
  if (error) return { error: error.message };
  revalidatePath("/");
  return {};
}

export async function setStatus(id: string, status: Status) {
  const supabase = await createClient();
  await supabase.from("applications").update({ status: validStatus(status) }).eq("id", id);
  revalidatePath("/");
}

export async function removeApplication(id: string) {
  const supabase = await createClient();
  await supabase.from("applications").delete().eq("id", id);
  revalidatePath("/");
}

export async function importApplications(rows: NewApp[]): Promise<{ added: number; skipped: number; error?: string }> {
  const supabase = await createClient();
  const { data: existing } = await supabase.from("applications").select("company, role");
  const seen = new Set((existing ?? []).map((r) => `${r.company}|${r.role}`.toLowerCase()));
  const fresh = rows.flatMap((r) => {
    const company = clean(r.company), role = clean(r.role);
    if (!company || !role) return [];
    const key = `${company}|${role}`.toLowerCase();
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ company, role, status: validStatus(r.status), location: clean(r.location), url: validUrl(r.url),
      source: clean(r.source), applied_on: validDate(r.applied_on), notes: clean(r.notes) }];
  });
  for (let i = 0; i < fresh.length; i += 500) {
    const { error } = await supabase.from("applications").insert(fresh.slice(i, i + 500));
    if (error) { revalidatePath("/"); return { added: i, skipped: rows.length - i, error: error.message }; }
  }
  revalidatePath("/");
  return { added: fresh.length, skipped: rows.length - fresh.length };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
