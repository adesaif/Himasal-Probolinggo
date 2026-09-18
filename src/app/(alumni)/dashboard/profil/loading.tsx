import { Skeleton } from "@/components/ui/skeleton";

export default function AlumniProfilLoading() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}
