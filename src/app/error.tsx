"use client";

import { useEffect } from "react";
import Link from "next/link";

import { AlertTriangle, Home, RotateCcw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled error:", error);
  }, [error]);

  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16">
      <div className="flex max-w-md flex-col items-center text-center">
        <div className="bg-destructive/10 mb-6 flex h-16 w-16 items-center justify-center rounded-full">
          <AlertTriangle className="text-destructive h-8 w-8" />
        </div>

        <h1 className="text-foreground mb-2 text-2xl font-bold">
          Something went wrong
        </h1>
        <p className="text-muted-foreground mb-8">
          An unexpected error occurred. Please try again or return to the home
          page.
        </p>

        {isDev && error.message ? (
          <pre className="border-border bg-muted text-muted-foreground mb-8 w-full overflow-x-auto rounded-lg border p-4 text-left text-xs">
            {error.message}
            {error.stack ? `\n\n${error.stack}` : ""}
          </pre>
        ) : null}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={reset}
            className="border-input bg-background hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring inline-flex h-10 items-center justify-center gap-2 rounded-md border px-4 text-sm font-medium shadow-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <RotateCcw className="h-4 w-4" />
            Try Again
          </button>
          <Link
            href="/"
            className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium shadow transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <Home className="h-4 w-4" />
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
