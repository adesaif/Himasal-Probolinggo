import { Skeleton } from "@/components/ui/skeleton";

export default function BerandaLoading() {
  return (
    <div className="flex flex-col gap-16">
      <Skeleton className="h-[420px] w-full rounded-2xl sm:h-[480px] lg:h-[560px]" />
      {Array.from({ length: 2 }).map((_, i) => (
        <section key={i} className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-5 w-24" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {Array.from({ length: 4 }).map((_, j) => (
              <Skeleton key={j} className="h-72 w-full" />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
