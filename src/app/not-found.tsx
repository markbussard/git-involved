import Link from "next/link";

import { FileQuestion, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16">
      <div className="flex max-w-md flex-col items-center text-center">
        <div className="bg-muted mb-6 flex h-16 w-16 items-center justify-center rounded-full">
          <FileQuestion className="text-muted-foreground h-8 w-8" />
        </div>

        <h1 className="text-foreground mb-2 text-2xl font-bold">
          Page Not Found
        </h1>
        <p className="text-muted-foreground mb-8">
          The page you are looking for does not exist or has been moved.
        </p>

        <Link
          href="/"
          className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium shadow transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <Home className="h-4 w-4" />
          Back to Home
        </Link>
      </div>
    </div>
  );
}
