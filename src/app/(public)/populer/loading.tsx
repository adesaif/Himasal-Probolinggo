import { Skeleton } from "@/components/ui/skeleton";

export default function PopulerLoading() {
  return (
    <div className="flex flex-col gap-8">
      <Skeleton className="h-9 w-40" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    </div>
  );
}
