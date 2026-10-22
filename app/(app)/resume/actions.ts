"use server";
import { createClient } from "@/lib/supabase/server";
import { sanitize } from "@/lib/resume";
import { renderResumePdf } from "@/lib/resumePdf";
import { PHOTO_BUCKET, PHOTO_MAX_BYTES, checkJpeg, photoPath } from "@/lib/photo";

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

  // Include the user's photo if they have one. It is re-checked here because users can write to Storage directly.
  let photo: Buffer | undefined;
  const { data: row } = await supabase.from("resumes").select("photo_path").eq("user_id", user.id).maybeSingle();
  if (row?.photo_path) {
    const dl = await supabase.storage.from(PHOTO_BUCKET).download(photoPath(user.id));
    const bytes = dl.data ? new Uint8Array(await dl.data.arrayBuffer()) : null;
    if (!bytes || checkJpeg(bytes)) return { error: "Your saved photo couldn’t be read. Remove it and upload it again." };
    photo = Buffer.from(bytes);
  }

  let pdf: Buffer;
  try {
    pdf = await renderResumePdf(res.data, photo);
  } catch (error) {
    console.error("[resume-pdf] Rendering failed:", error);

    return {
      error: "PDF generation failed. Please try again or contact support.",
    };
  }

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

// The browser has already shrunk the photo to a small square JPEG. Here we re-verify the bytes, because the browser can't be trusted.
export async function uploadResumePhoto(fd: FormData): Promise<{ error?: string; version?: string }> {
  const file = fd.get("photo");
  if (!(file instanceof File)) return { error: "No photo was received." };
  if (file.size > PHOTO_MAX_BYTES) return { error: "That photo is too large after processing. Try a different one." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const bad = checkJpeg(bytes);
  if (bad) return { error: bad };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You’re not signed in." };
  const path = photoPath(user.id);
  const up = await supabase.storage.from(PHOTO_BUCKET).upload(path, bytes, { contentType: "image/jpeg", upsert: true, cacheControl: "0" });
  if (up.error) return { error: `Couldn’t store the photo: ${up.error.message}` };
  const { error } = await supabase.from("resumes").upsert(
    { user_id: user.id, photo_path: path, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) return { error: error.message };
  return { version: String(Date.now()) };
}

export async function removeResumePhoto(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You’re not signed in." };
  const rm = await supabase.storage.from(PHOTO_BUCKET).remove([photoPath(user.id)]);
  if (rm.error) return { error: `Couldn’t remove the photo: ${rm.error.message}` };
  const { error } = await supabase.from("resumes").upsert(
    { user_id: user.id, photo_path: null, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  return error ? { error: error.message } : {};
}
