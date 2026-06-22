export function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-48 animate-pulse rounded-3xl bg-white/5" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-2xl bg-white/5" />
        ))}
      </div>
    </div>
  );
}