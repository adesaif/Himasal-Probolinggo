import { Skeleton } from "@/components/ui/skeleton";

export default function AlumniAbsensiLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-full sm:w-32" />
      </div>
      {Array.from({ length: 2 }).map((_, s) => (
        <div key={s} className="flex flex-col gap-3">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}
