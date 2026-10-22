"use client";
import { createContext, startTransition, useCallback, useContext, useMemo, useState } from "react";

type Ctx = {
  busy: string | null;
  setBusy: (label: string | null) => void;
  fail: string;
  clearFail: () => void;
  withBusy: (label: string, fn: (setLabel: (l: string) => void) => Promise<void>) => Promise<void>;
};
const BusyCtx = createContext<Ctx | null>(null);

export function useBusy() {
  const c = useContext(BusyCtx);
  if (!c) throw new Error("useBusy must be used inside <BusyProvider>");
  return c;
}

// One loading overlay for the whole app. Every page uses withBusy, so "Saving…", "Generating CV…" etc. look identical.
// Call withBusy straight from an event handler (never inside a form `action` or a transition): React defers
// state updates made inside those until the server call finishes, so the overlay would appear too late.
export function BusyProvider({ children }: { children: React.ReactNode }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [fail, setFail] = useState("");
  const clearFail = useCallback(() => setFail(""), []);
  const withBusy = useCallback<Ctx["withBusy"]>(async (label, fn) => {
    setFail(""); setBusy(label);
    try { await fn(setBusy); } catch { setFail("Something went wrong. Please try again."); } finally { startTransition(() => setBusy(null)); }
  }, []);
  const value = useMemo(() => ({ busy, setBusy, fail, clearFail, withBusy }), [busy, fail, clearFail, withBusy]);
  return (
    <BusyCtx.Provider value={value}>
      <div inert={busy !== null}>{children}</div>
      {busy && (
        <div role="status" aria-live="assertive" className="fixed inset-0 z-50 grid place-items-center bg-ink/50">
          <div className="flex items-center gap-3 rounded bg-white px-5 py-4 shadow-lg">
            <span aria-hidden className="size-5 animate-spin rounded-full border-2 border-line border-t-accent" />
            <span className="font-medium">{busy}</span>
          </div>
        </div>
      )}
    </BusyCtx.Provider>
  );
}
