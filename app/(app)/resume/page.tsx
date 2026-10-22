import ResumeBuilder from "@/components/ResumeBuilder";
import { createClient } from "@/lib/supabase/server";
import { prepare } from "@/lib/resume";

export default async function ResumePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: row } = await supabase.from("resumes").select("data, file_path, generated_at").eq("user_id", user?.id ?? "").maybeSingle();
  return <ResumeBuilder initial={prepare(row?.data)} hasFile={!!row?.file_path} generatedAt={row?.generated_at ?? null} />;
}
