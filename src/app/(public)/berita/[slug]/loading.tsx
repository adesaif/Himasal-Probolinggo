import { Skeleton } from "@/components/ui/skeleton";

export default function BeritaDetailLoading() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-5 w-24" />
      <Skeleton className="aspect-video w-full rounded-lg" />
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-4 w-32" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}
