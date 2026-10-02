import { Skeleton } from "@/components/ui/skeleton";

export default function StrukturLoading() {
  return (
    <div className="flex flex-col gap-10 md:gap-12">
      <div className="flex flex-col gap-2 md:items-center">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-56" />
      </div>

      <div className="rounded-3xl border border-dashed px-4 py-6">
        <Skeleton className="mx-auto h-6 w-40" />
        <div className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex w-[calc(50%-0.5rem)] flex-col items-center gap-3 sm:w-36">
              <Skeleton className="size-16 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 rounded-3xl border px-6 py-8 md:mx-auto md:w-full md:max-w-sm">
        <Skeleton className="size-28 rounded-full md:size-32" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-3 w-24" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2.5">
            <Skeleton className="h-3 w-20 md:mx-auto" />
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
