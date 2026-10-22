// Instant fallback for the Resume Builder page. Sized like the real form (max-w-4xl).
const bar = "rounded bg-slate-200 motion-reduce:animate-none";
export default function Loading() {
  return (
    <div role="status" aria-busy="true" className="mx-auto max-w-4xl animate-pulse px-4 py-8 motion-reduce:animate-none sm:px-6">
      <span className="sr-only">Loading resume builder…</span>
      <div className={`${bar} mb-6 h-9 w-56`} />
      {[0, 1, 2].map((i) => (
        <div key={i} className="mb-5 rounded border border-line bg-white p-4">
          <div className={`${bar} mb-4 h-6 w-40`} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className={`${bar} h-10`} /><div className={`${bar} h-10`} /><div className={`${bar} h-10`} /><div className={`${bar} h-10`} />
          </div>
        </div>
      ))}
    </div>
  );
}
