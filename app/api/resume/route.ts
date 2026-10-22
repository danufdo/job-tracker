import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Signs the user in-request, then redirects to a Supabase signed URL that expires after 60 seconds.
// The bucket is private, so there is never a permanent public link.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Not signed in.", { status: 401 });
  const { data: row } = await supabase.from("resumes").select("file_path, data").eq("user_id", user.id).maybeSingle();
  if (!row?.file_path) return new NextResponse("No CV has been generated yet.", { status: 404 });
  const who = String((row.data as { name?: string } | null)?.name ?? "").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  const { data, error } = await supabase.storage.from("resumes").createSignedUrl(row.file_path, 60, { download: `${who || "CV"}_CV.pdf` });
  if (error || !data) return new NextResponse("Couldn’t prepare the download.", { status: 500 });
  return NextResponse.redirect(data.signedUrl);
}
