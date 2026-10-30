export function EmissionCardSkeleton() {
  return (
    <li aria-hidden="true" className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex justify-between gap-3">
        <div className="h-4 w-2/3 rounded bg-slate-200" />
        <div className="h-5 w-20 rounded-full bg-slate-200" />
      </div>
      <div className="mt-8 h-8 w-1/2 rounded bg-slate-200" />
      <div className="mt-4 h-3 w-1/3 rounded bg-slate-100" />
    </li>
  );
}
