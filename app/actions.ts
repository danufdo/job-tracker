"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createJsClient } from "@supabase/supabase-js";
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

const nonNeg = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null);
const num = (v: unknown) => {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
};

export async function updateApplication(id: string, fd: FormData): Promise<{ error?: string }> {
  const company = clean(fd.get("company")), role = clean(fd.get("role"));
  if (!company || !role) return { error: "Company and role are required." };
  const url = clean(fd.get("url"));
  if (url && !validUrl(url)) return { error: "The posting URL must start with http:// or https://." };
  const min = num(fd.get("offer_min")), max = num(fd.get("offer_max"));
  if (Number.isNaN(min) || Number.isNaN(max)) return { error: "Offer amounts must be positive numbers." };
  if (min !== null && max !== null && min > max) return { error: "The offer minimum can’t be higher than the maximum." };
  const supabase = await createClient();
  const { error } = await supabase.from("applications").update({
    company: company.slice(0, 200), role: role.slice(0, 200), status: validStatus(fd.get("status")),
    location: clean(fd.get("location"))?.slice(0, 200) ?? null, url, applied_on: validDate(fd.get("applied_on")),
    offer_min: min, offer_max: max,
    offer_currency: clean(fd.get("offer_currency"))?.toUpperCase().slice(0, 8) ?? null,
    offer_details: clean(fd.get("offer_details"))?.slice(0, 1000) ?? null,
    notes: clean(fd.get("notes"))?.slice(0, 5000) ?? null,
  }).eq("id", id);
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
    let min = nonNeg(r.offer_min), max = nonNeg(r.offer_max);
    if (min !== null && max !== null && min > max) [min, max] = [max, min];
    return [{ company, role, status: validStatus(r.status), location: clean(r.location), url: validUrl(r.url),
      source: clean(r.source), applied_on: validDate(r.applied_on), notes: clean(r.notes)?.slice(0, 5000) ?? null,
      offer_min: min, offer_max: max, offer_currency: clean(r.offer_currency)?.toUpperCase().slice(0, 8) ?? null,
      offer_details: clean(r.offer_details)?.slice(0, 1000) ?? null }];
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

export async function deleteAccount(fd: FormData): Promise<{ error?: string; done?: boolean }> {
  if (String(fd.get("confirm") ?? "").trim() !== "DELETE") return { error: "Type DELETE to confirm." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { error: "You’re not signed in." };

  // Re-check the password with a throwaway client so no session cookies change.
  const check = createJsClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: pwError } = await check.auth.signInWithPassword({ email: user.email, password: String(fd.get("password") ?? "") });
  if (pwError) return { error: "That password isn’t correct." };

  const { error } = await supabase.rpc("delete_my_account");
  if (error) return { error: `Couldn’t delete the account: ${error.message}` };
  await supabase.auth.signOut();
  return { done: true };
}
