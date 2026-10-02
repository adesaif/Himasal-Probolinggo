import { Skeleton } from "@/components/ui/skeleton";

export default function AdminAbsensiQrLoading() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-80 w-80" />
      <Skeleton className="h-9 w-32" />
    </div>
  );
}
