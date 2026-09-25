import { Skeleton } from "@/components/ui/skeleton";

export default function BeritaDetailLoading() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Skeleton className="h-5 w-24" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="aspect-video w-full rounded-2xl" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}
