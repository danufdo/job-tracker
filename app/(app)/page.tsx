import Tracker from "@/components/Tracker";
import { createClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/fetchAll";
import type { App } from "@/lib/types";

export default async function Home() {
  const supabase = await createClient();
  const rows = await (
    // Order includes id so page boundaries are stable even when many rows share a date.
    fetchAll<App>((from, to) => supabase.from("applications")
      .select("id,company,role,status,location,url,source,applied_on,notes,offer_min,offer_max,offer_currency,offer_details")
      .order("applied_on", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .order("id")
      .range(from, to)));
  return <Tracker initial={rows} />;
}
