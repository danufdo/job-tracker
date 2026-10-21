import Tracker from "@/components/Tracker";
import { createClient } from "@/lib/supabase/server";
import type { App } from "@/lib/types";

export default async function Home() {
  const supabase = await createClient();
  const [{ data: { user } }, { data }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("applications")
      .select("id,company,role,status,location,url,source,applied_on,notes,offer_min,offer_max,offer_currency,offer_details")
      .order("applied_on", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(1000),
  ]);
  return <Tracker initial={(data ?? []) as App[]} email={user?.email ?? ""} />;
}
