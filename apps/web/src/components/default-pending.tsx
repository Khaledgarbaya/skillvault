import { Skeleton } from "~/components/ui/skeleton";

export function DefaultPending() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-56" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    </div>
  );
}
