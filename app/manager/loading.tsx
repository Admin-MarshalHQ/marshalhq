import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div>
      <div className="mb-6 border-b border-line pb-4">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="mt-2 h-8 w-64" />
        <Skeleton className="mt-2 h-4 w-96 max-w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}
