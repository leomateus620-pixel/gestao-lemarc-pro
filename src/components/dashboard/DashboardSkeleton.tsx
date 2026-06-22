export function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6 shadow-[inset_0_1px_0_oklch(1_0_0/0.08)]">
        <div className="lemarc-shimmer absolute inset-0 opacity-30" />
        <div className="relative max-w-xl space-y-4">
          <div className="h-3 w-36 rounded-full bg-white/[0.08]" />
          <div className="h-9 w-64 rounded-xl bg-white/[0.08]" />
          <div className="h-4 w-full max-w-md rounded-full bg-white/[0.06]" />
          <div className="h-4 w-72 rounded-full bg-white/[0.05]" />
        </div>
        <div className="relative mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl border border-white/[0.08] bg-white/[0.035]" />
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-white/[0.08] bg-white/[0.04] p-3">
        <div className="lemarc-shimmer h-10 rounded-2xl bg-white/[0.06]" />
      </div>

      <div className="grid items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <SkeletonMetric key={i} />
        ))}
      </div>
    </div>
  );
}

function SkeletonMetric() {
  return (
    <div className="relative min-h-[252px] overflow-hidden rounded-[1.4rem] border border-white/[0.07] bg-white/[0.03] p-5 shadow-[inset_0_1px_0_oklch(1_0_0/0.06)]">
      <div className="lemarc-shimmer absolute inset-0 opacity-25" />
      <div className="relative pl-2">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-3">
            <div className="h-2.5 w-28 rounded-full bg-white/[0.08]" />
            <div className="h-10 w-16 rounded-xl bg-white/[0.08]" />
          </div>
          <div className="h-10 w-10 rounded-xl bg-white/[0.06]" />
        </div>
        <div className="mt-4 h-3 w-full rounded-full bg-white/[0.06]" />
        <div className="mt-3.5 space-y-2 rounded-xl border border-white/[0.05] bg-white/[0.02] p-2.5">
          <div className="h-6 rounded-md bg-white/[0.05]" />
          <div className="h-6 rounded-md bg-white/[0.05]" />
          <div className="h-6 rounded-md bg-white/[0.05]" />
        </div>
      </div>
      <div className="absolute bottom-10 left-6 right-4 h-px bg-white/[0.06]" />
      <div className="absolute bottom-6 left-0 top-6 w-[3px] rounded-r-full bg-white/[0.07]" />
    </div>
  );
}
