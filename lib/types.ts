export const STATUSES = ["saved", "applied", "interview", "offer", "rejected"] as const;
export type Status = (typeof STATUSES)[number];
export type App = {
  id: string; company: string; role: string; status: Status;
  location: string | null; url: string | null; source: string | null;
  applied_on: string | null; notes: string | null;
};
export type NewApp = Partial<Omit<App, "id">> & { company: string; role: string };
