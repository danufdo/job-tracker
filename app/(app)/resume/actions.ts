"use server";
import { createClient } from "@/lib/supabase/server";
import { sanitize } from "@/lib/resume";
import { renderResumePdf } from "@/lib/resumePdf";

export async function saveResumeDraft(raw: unknown): Promise<{ error?: string }> {
  const res = sanitize(raw, false);
  if ("error" in res) return { error: res.error };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You’re not signed in." };
  const { error } = await supabase.from("resumes").upsert(
    { user_id: user.id, data: res.data, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  return error ? { error: error.message } : {};
}

export async function generateResume(raw: unknown): Promise<{ error?: string; generatedAt?: string }> {
  const res = sanitize(raw, true);
  if ("error" in res) return { error: res.error };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You’re not signed in." };

  let pdf: Buffer;
  try { pdf = await renderResumePdf(res.data); }
  catch { return { error: "Couldn’t build the PDF. Check for very long unbroken text and try again." }; }

  // One file per user: each regeneration overwrites {user_id}/cv.pdf.
  const path = `${user.id}/cv.pdf`;
  const up = await supabase.storage.from("resumes").upload(path, pdf, { contentType: "application/pdf", upsert: true, cacheControl: "0" });
  if (up.error) return { error: `Couldn’t store the PDF: ${up.error.message}` };

  const generatedAt = new Date().toISOString();
  const { error } = await supabase.from("resumes").upsert(
    { user_id: user.id, data: res.data, file_path: path, generated_at: generatedAt, updated_at: generatedAt }, { onConflict: "user_id" });
  if (error) return { error: error.message };
  return { generatedAt };
}
