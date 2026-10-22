// Shown instantly in place of the Applications page while it loads (Next.js wraps the page in <Suspense> with this).
// The sidebar stays put. Sized like the real page so nothing jumps when it arrives.
const bar = "rounded bg-slate-200 motion-reduce:animate-none";
export default function Loading() {
  return (
    <div role="status" aria-busy="true" className="mx-auto max-w-6xl animate-pulse px-4 py-8 motion-reduce:animate-none sm:px-6">
      <span className="sr-only">Loading applications…</span>
      <div className={`${bar} mb-6 h-9 w-48`} />
      <div className="mb-4 grid grid-cols-3 gap-px overflow-hidden rounded border border-line bg-line sm:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-[70px] bg-white" />)}
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className={`${bar} h-10 min-w-64 flex-1`} /><div className={`${bar} h-10 w-28`} /><div className={`${bar} h-10 w-32`} /><div className={`${bar} h-10 w-28`} />
      </div>
      <div className="overflow-hidden rounded border border-line bg-white">
        {Array.from({ length: 6 }, (_, i) => <div key={i} className="m-3"><div className={`${bar} h-6`} /></div>)}
      </div>
    </div>
  );
}
