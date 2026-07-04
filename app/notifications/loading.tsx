import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 border-b border-line pb-4">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="mt-2 h-8 w-40" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  );
}
