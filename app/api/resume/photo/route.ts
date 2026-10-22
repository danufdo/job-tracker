import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PHOTO_BUCKET, photoPath } from "@/lib/photo";

export const dynamic = "force-dynamic";

// Shows the signed-in user's own photo in the form. The bucket is private, so this signs them in-request and redirects to a
// short-lived signed URL. The page adds ?v=<timestamp> after an upload so the browser doesn't show the old picture.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Not signed in.", { status: 401 });
  const { data: row } = await supabase.from("resumes").select("photo_path").eq("user_id", user.id).maybeSingle();
  if (!row?.photo_path) return new NextResponse("No photo.", { status: 404 });
  const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(photoPath(user.id), 60);
  if (error || !data) return new NextResponse("Couldn’t load the photo.", { status: 500 });
  const res = NextResponse.redirect(data.signedUrl);
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}
