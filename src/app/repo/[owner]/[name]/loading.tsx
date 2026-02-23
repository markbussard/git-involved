import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";

export default function RepoDetailLoading() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-5 w-full max-w-xl" />
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap items-center gap-4">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-28" />
        </div>

        {/* Language badges */}
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>

        {/* Metadata row */}
        <div className="flex flex-wrap items-center gap-4">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-32" />
        </div>

        {/* Topics */}
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-20 rounded-full" />
          ))}
        </div>
      </div>

      <Separator className="my-8" />

      {/* README section */}
      <section className="space-y-4">
        <Skeleton className="h-7 w-28" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/6" />
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </section>

      <Separator className="my-8" />

      {/* Issues section */}
      <section className="space-y-4">
        <Skeleton className="h-7 w-36" />
        {/* Filter bar skeleton */}
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-7 w-14 rounded-lg" />
          <Skeleton className="h-7 w-20 rounded-lg" />
          <Skeleton className="h-7 w-28 rounded-lg" />
          <Skeleton className="h-7 w-22 rounded-lg" />
        </div>
        {/* Issue rows skeleton */}
        <div className="divide-border border-border divide-y rounded-lg border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2 p-4">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-8" />
                <Skeleton className="h-4 w-3/4" />
              </div>
              <div className="flex items-center gap-3 pl-6">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-4 w-8" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
