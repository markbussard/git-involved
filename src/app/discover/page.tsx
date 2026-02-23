"use client";

import { Suspense, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, RefreshCw, SearchX } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { RepoCard } from "~/components/discovery/repo-card";
import { useDiscovery } from "~/lib/api/hooks";
import type { DiscoveryQuery } from "~/lib/discovery/constants";

function parseQueryParam(q: string | null): DiscoveryQuery | null {
  if (!q) return null;
  try {
    const decoded = atob(q);
    const parsed: unknown = JSON.parse(decoded);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "languages" in parsed &&
      "experienceLevel" in parsed &&
      "repoSizes" in parsed
    ) {
      return parsed as DiscoveryQuery;
    }
    return null;
  } catch {
    return null;
  }
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-6">
          <div className="space-y-3">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            <div className="mt-4 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function DiscoverContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawQuery = searchParams.get("q");

  const query = useMemo(() => parseQueryParam(rawQuery), [rawQuery]);
  const { mutate, data, isPending, isError, error, reset } = useDiscovery();

  useEffect(() => {
    if (query) {
      mutate(query);
    }
  }, [query, mutate]);

  if (!query) {
    return (
      <div className="flex flex-col items-center justify-center bg-background px-6">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h1 className="mb-2 text-2xl font-bold text-foreground">
            Invalid Search
          </h1>
          <p className="mb-6 text-muted-foreground">
            The search query is missing or invalid. Please start a new search.
          </p>
          <Button onClick={() => router.push("/")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Start Over
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center bg-background">
      <main className="w-full max-w-3xl px-6 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Recommended Projects
            </h1>
            <p className="mt-1 text-muted-foreground">
              Projects and issues matched to your preferences.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push("/")}
            className="shrink-0 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Refine Search
          </Button>
        </div>

        {isPending && <LoadingSkeleton />}

        {isError && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16 text-center">
            <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
            <h2 className="mb-2 text-xl font-semibold text-foreground">
              Something went wrong
            </h2>
            <p className="mb-6 max-w-md text-muted-foreground">
              {error instanceof Error
                ? error.message
                : "An unexpected error occurred while searching for projects."}
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => router.push("/")}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Go Back
              </Button>
              <Button
                onClick={() => {
                  reset();
                  mutate(query);
                }}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </Button>
            </div>
          </div>
        )}

        {!isPending && !isError && data && data.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16 text-center">
            <SearchX className="mb-4 h-12 w-12 text-muted-foreground" />
            <h2 className="mb-2 text-xl font-semibold text-foreground">
              No projects found
            </h2>
            <p className="mb-6 max-w-md text-muted-foreground">
              We could not find any projects matching your criteria. Try
              adjusting your language, experience level, or project size
              preferences.
            </p>
            <Button onClick={() => router.push("/")} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Adjust Preferences
            </Button>
          </div>
        )}

        {!isPending && !isError && data && data.length > 0 && (
          <div className="space-y-6">
            {data.map((repo) => (
              <RepoCard key={repo.id} repo={repo} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function DiscoverPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <DiscoverContent />
    </Suspense>
  );
}
