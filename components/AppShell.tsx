"use client";
import { useEffect } from "react";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/actions";
import { BusyProvider, useBusy } from "./Busy";

const NAV = [
  { href: "/", label: "Applications" },
  { href: "/resume", label: "Resume Builder" },
];

// Must render inside <Link>: useLinkStatus reports whether *that* link's navigation is still in flight.
// Always in the layout (just transparent) so the item never changes width. The short delay stops it flashing on fast navigations.
function NavPending() {
  const { pending } = useLinkStatus();
  return (
    <>
      <span aria-hidden className={`size-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none ${pending ? "opacity-100 transition-opacity delay-150 duration-150" : "opacity-0"}`} />
      <span role="status" className="sr-only">{pending ? "Loading" : ""}</span>
    </>
  );
}

function Shell({ email, children }: { email: string; children: React.ReactNode }) {
  const path = usePathname();
  const { setBusy, clearFail } = useBusy();
  useEffect(() => { clearFail(); }, [path, clearFail]);
  return (
    <div className="md:flex md:min-h-screen">
      <aside className="flex items-center gap-4 overflow-x-auto border-b border-line bg-white px-4 py-3 md:sticky md:top-0 md:h-screen md:w-56 md:shrink-0 md:flex-col md:items-stretch md:gap-0 md:overflow-y-auto md:border-b-0 md:border-r md:px-4 md:py-8">
        <span className="font-display text-xl font-bold tracking-tight md:mb-6">Job Tracker</span>
        <nav aria-label="Main" className="flex gap-1 md:flex-1 md:flex-col">
          {NAV.map((n) => {
            const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined}
                className={`flex items-center justify-between gap-2 whitespace-nowrap rounded px-3 py-2 text-sm font-medium ${active ? "bg-ink text-white" : "text-slate-700 hover:bg-slate-100"}`}>
                {n.label}<NavPending />
              </Link>
            );
          })}
        </nav>
        <form onSubmit={(e) => { e.preventDefault(); setBusy("Signing out…"); void signOut(); }}
          className="ml-auto flex items-center gap-3 text-sm text-slate-600 md:ml-0 md:mt-6 md:flex-col md:items-start md:gap-1">
          <span className="hidden max-w-full truncate md:block">{email}</span>
          <button className="underline">Sign out</button>
        </form>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export default function AppShell({ email, children }: { email: string; children: React.ReactNode }) {
  return <BusyProvider><Shell email={email}>{children}</Shell></BusyProvider>;
}
