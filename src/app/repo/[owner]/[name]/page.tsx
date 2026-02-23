import { Suspense } from "react";
import { notFound } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Star,
  GitFork,
  CircleDot,
  Scale,
  Clock,
  ExternalLink,
  BookOpen,
} from "lucide-react";
import { db } from "~/lib/db";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";
import { IssueList } from "~/components/repo/issue-list";
import { formatDate } from "~/lib/utils/date";

const ReadmeRenderer = dynamic(
  () => import("~/components/repo/readme-renderer"),
  {
    loading: () => (
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/6" />
      </div>
    ),
  }
);

interface RepoPageProps {
  params: Promise<{ owner: string; name: string }>;
}

export default async function RepoDetailPage({ params }: RepoPageProps) {
  const { owner, name } = await params;

  const repo = await db.repository.findFirst({
    where: { fullName: `${owner}/${name}` },
    include: {
      issues: {
        where: { state: "OPEN" },
        orderBy: [{ difficulty: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!repo) {
    notFound();
  }

  const issueData = repo.issues.map((issue) => ({
    id: issue.id,
    number: issue.number,
    title: issue.title,
    url: issue.url,
    labels: issue.labels,
    commentCount: issue.commentCount,
    createdAt: issue.createdAt.toISOString(),
    difficulty: issue.difficulty,
    isGoodFirstIssue: issue.isGoodFirstIssue,
  }));

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {repo.fullName}
            </h1>
            <a
              href={repo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="View on GitHub"
            >
              <ExternalLink className="size-4" />
              <span className="hidden sm:inline">GitHub</span>
            </a>
          </div>
          {repo.description ? (
            <p className="text-base text-muted-foreground leading-relaxed">
              {repo.description}
            </p>
          ) : null}
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Star className="size-4 fill-amber-400 text-amber-400" />
            <span className="font-medium text-foreground">
              {formatStarCount(repo.stars)}
            </span>
            stars
          </span>
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <GitFork className="size-4" />
            <span className="font-medium text-foreground">
              {formatStarCount(repo.forks)}
            </span>
            forks
          </span>
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <CircleDot className="size-4" />
            <span className="font-medium text-foreground">
              {repo.openIssuesCount}
            </span>
            open issues
          </span>
        </div>

        {/* Languages */}
        {repo.languages.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            {repo.languages.map((lang) => (
              <Badge
                key={lang}
                variant={lang === repo.primaryLanguage ? "default" : "secondary"}
                className="text-xs"
              >
                {lang}
              </Badge>
            ))}
          </div>
        ) : null}

        {/* Metadata row */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          {repo.license ? (
            <span className="inline-flex items-center gap-1.5">
              <Scale className="size-4" />
              {repo.license}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-4" />
            Last pushed {formatDate(repo.pushedAt)}
          </span>
        </div>

        {/* Topics */}
        {repo.topics.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {repo.topics.map((topic) => (
              <Badge
                key={topic}
                variant="outline"
                className="text-xs font-normal"
              >
                {topic}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>

      {/* README */}
      {repo.readme ? (
        <>
          <Separator className="my-8" />
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
              <BookOpen className="size-5" />
              README
            </h2>
            <div className="rounded-lg border border-border bg-card p-6">
              <Suspense
                fallback={
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-4/6" />
                  </div>
                }
              >
                <ReadmeRenderer content={repo.readme} />
              </Suspense>
            </div>
          </section>
        </>
      ) : null}

      {/* Issues */}
      <Separator className="my-8" />
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
          <CircleDot className="size-5" />
          Open Issues
          <span className="ml-1 text-sm font-normal text-muted-foreground">
            ({repo.issues.length})
          </span>
        </h2>
        {repo.issues.length > 0 ? (
          <IssueList issues={issueData} />
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
            <p className="text-sm font-medium text-foreground">
              No open issues
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              This repository has no open issues at the moment.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

function formatStarCount(count: number): string {
  if (count >= 1000) {
    const formatted = (count / 1000).toFixed(1);
    return `${formatted.endsWith(".0") ? (count / 1000).toFixed(0) : formatted}k`;
  }
  return count.toLocaleString();
}
