"use client";

import Link from "next/link";

import { ExternalLink, Star } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import type { DiscoveryResult, MatchedIssue } from "~/lib/discovery/constants";
import { cn } from "~/lib/utils";

const MAX_VISIBLE_TOPICS = 4;

const DIFFICULTY_STYLES: Record<MatchedIssue["difficulty"], string> = {
  beginner:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  intermediate:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  advanced: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400",
};

interface RepoCardProps {
  repo: DiscoveryResult;
}

export function RepoCard({ repo }: RepoCardProps) {
  const visibleTopics = repo.topics.slice(0, MAX_VISIBLE_TOPICS);
  const remainingCount = repo.topics.length - MAX_VISIBLE_TOPICS;

  return (
    <Card className="transition-shadow duration-200 hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <Link
              href={`/repo/${repo.owner}/${repo.name}`}
              className="group inline-flex items-center gap-1.5"
            >
              <span className="text-foreground group-hover:text-primary text-lg font-semibold transition-colors">
                {repo.fullName}
              </span>
              <ExternalLink className="text-muted-foreground h-4 w-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
            {repo.description && (
              <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                {repo.description}
              </p>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="text-muted-foreground inline-flex items-center gap-1 text-sm">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            <span className="font-medium">{formatStarCount(repo.stars)}</span>
          </div>

          {repo.language && (
            <Badge variant="secondary" className="text-xs">
              {repo.language}
            </Badge>
          )}
        </div>

        {visibleTopics.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {visibleTopics.map((topic) => (
              <Badge
                key={topic}
                variant="outline"
                className="text-xs font-normal"
              >
                {topic}
              </Badge>
            ))}
            {remainingCount > 0 && (
              <Badge
                variant="outline"
                className="text-muted-foreground text-xs font-normal"
              >
                +{remainingCount} more
              </Badge>
            )}
          </div>
        )}
      </CardHeader>

      {repo.matchedIssues.length > 0 && (
        <CardContent className="pt-0">
          <Separator className="mb-4" />
          <h4 className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">
            Matching Issues
          </h4>
          <div className="space-y-3">
            {repo.matchedIssues.map((issue) => (
              <IssueRow key={issue.number} issue={issue} />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function IssueRow({ issue }: { issue: MatchedIssue }) {
  return (
    <div className="border-border bg-muted/30 flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <a
          href={issue.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-start gap-1.5"
        >
          <span className="text-muted-foreground shrink-0 text-sm font-medium">
            #{issue.number}
          </span>
          <span className="text-foreground group-hover:text-primary text-sm font-medium transition-colors">
            {issue.title}
          </span>
        </a>
        {issue.labels.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {issue.labels.map((label) => (
              <span
                key={label}
                className="bg-muted text-muted-foreground inline-flex items-center rounded-full px-2 py-0.5 text-xs"
              >
                {label}
              </span>
            ))}
          </div>
        )}
      </div>
      <Badge
        variant="outline"
        className={cn(
          "shrink-0 text-xs capitalize",
          DIFFICULTY_STYLES[issue.difficulty],
        )}
      >
        {issue.difficulty}
      </Badge>
    </div>
  );
}

function formatStarCount(stars: number): string {
  if (stars >= 1000) {
    const formatted = (stars / 1000).toFixed(1);
    return `${formatted.endsWith(".0") ? (stars / 1000).toFixed(0) : formatted}k`;
  }
  return stars.toLocaleString();
}
