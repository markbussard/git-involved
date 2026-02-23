import { Suspense } from "react";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";

import {
  BookOpen,
  CircleDot,
  Clock,
  ExternalLink,
  GitFork,
  Scale,
  Star,
} from "lucide-react";

import { IssueList } from "~/components/repo/issue-list";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";
import { db } from "~/lib/db";
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
  },
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
            <h1 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
              {repo.fullName}
            </h1>
            <a
              href={repo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm transition-colors"
              aria-label="View on GitHub"
            >
              <ExternalLink className="size-4" />
              <span className="hidden sm:inline">GitHub</span>
            </a>
          </div>
          {repo.description ? (
            <p className="text-muted-foreground text-base leading-relaxed">
              {repo.description}
            </p>
          ) : null}
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="text-muted-foreground inline-flex items-center gap-1.5">
            <Star className="size-4 fill-amber-400 text-amber-400" />
            <span className="text-foreground font-medium">
              {formatStarCount(repo.stars)}
            </span>
            stars
          </span>
          <span className="text-muted-foreground inline-flex items-center gap-1.5">
            <GitFork className="size-4" />
            <span className="text-foreground font-medium">
              {formatStarCount(repo.forks)}
            </span>
            forks
          </span>
          <span className="text-muted-foreground inline-flex items-center gap-1.5">
            <CircleDot className="size-4" />
            <span className="text-foreground font-medium">
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
                variant={
                  lang === repo.primaryLanguage ? "default" : "secondary"
                }
                className="text-xs"
              >
                {lang}
              </Badge>
            ))}
          </div>
        ) : null}

        {/* Metadata row */}
        <div className="text-muted-foreground flex flex-wrap items-center gap-4 text-sm">
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
            <h2 className="text-foreground mb-4 flex items-center gap-2 text-lg font-semibold">
              <BookOpen className="size-5" />
              README
            </h2>
            <div className="border-border bg-card rounded-lg border p-6">
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
                <ReadmeRenderer
                  content={repo.readme}
                  repoFullName={repo.fullName}
                />
              </Suspense>
            </div>
          </section>
        </>
      ) : null}

      {/* Issues */}
      <Separator className="my-8" />
      <section>
        <h2 className="text-foreground mb-4 flex items-center gap-2 text-lg font-semibold">
          <CircleDot className="size-5" />
          Open Issues
          <span className="text-muted-foreground ml-1 text-sm font-normal">
            ({repo.issues.length})
          </span>
        </h2>
        {repo.issues.length > 0 ? (
          <IssueList issues={issueData} />
        ) : (
          <div className="border-border flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
            <p className="text-foreground text-sm font-medium">
              No open issues
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
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
