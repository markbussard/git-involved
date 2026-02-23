"use client";

import { useState } from "react";

import { MessageSquare } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Toggle } from "~/components/ui/toggle";
import type { Difficulty } from "~/generated/prisma/client";
import { cn } from "~/lib/utils";
import { formatRelativeDate } from "~/lib/utils/date";

interface IssueItem {
  id: string;
  number: number;
  title: string;
  url: string;
  labels: string[];
  commentCount: number;
  createdAt: Date | string;
  difficulty: Difficulty | null;
  isGoodFirstIssue: boolean;
}

interface IssueListProps {
  issues: IssueItem[];
}

type DifficultyFilter = "ALL" | "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
type SortOption = "newest" | "least-comments";

const DIFFICULTY_FILTERS: { value: DifficultyFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "BEGINNER", label: "Beginner" },
  { value: "INTERMEDIATE", label: "Intermediate" },
  { value: "ADVANCED", label: "Advanced" },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "least-comments", label: "Least comments" },
];

const DIFFICULTY_STYLES: Record<string, string> = {
  BEGINNER:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  INTERMEDIATE:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  ADVANCED: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400",
};

const DIFFICULTY_DOT_COLORS: Record<string, string> = {
  BEGINNER: "bg-emerald-500",
  INTERMEDIATE: "bg-amber-500",
  ADVANCED: "bg-red-500",
};

export function IssueList({ issues }: IssueListProps) {
  const [difficultyFilter, setDifficultyFilter] =
    useState<DifficultyFilter>("ALL");
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [goodFirstIssueOnly, setGoodFirstIssueOnly] = useState(false);

  // Derive filtered and sorted state during render (rule 5.1)
  const filteredAndSorted = getFilteredAndSortedIssues(
    issues,
    difficultyFilter,
    sortOption,
    goodFirstIssueOnly,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {DIFFICULTY_FILTERS.map((filter) => (
            <Button
              key={filter.value}
              variant={
                difficultyFilter === filter.value ? "default" : "outline"
              }
              size="sm"
              onClick={() => setDifficultyFilter(filter.value)}
            >
              {filter.value !== "ALL" ? (
                <span
                  data-icon="inline-start"
                  className={cn(
                    "inline-block size-2 rounded-full",
                    DIFFICULTY_DOT_COLORS[filter.value],
                  )}
                />
              ) : null}
              {filter.label}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Toggle
            variant="outline"
            size="sm"
            pressed={goodFirstIssueOnly}
            onPressedChange={setGoodFirstIssueOnly}
            aria-label="Show good first issues only"
            className="text-xs"
          >
            Good first issue
          </Toggle>

          <div className="border-border flex items-center gap-1 rounded-lg border">
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setSortOption(option.value)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  sortOption === option.value
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filteredAndSorted.length === 0 ? (
        <div className="border-border flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
          <p className="text-foreground text-sm font-medium">
            No issues match your filters
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            Try adjusting the difficulty or removing the good first issue
            filter.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs">
            {filteredAndSorted.length}{" "}
            {filteredAndSorted.length === 1 ? "issue" : "issues"}
          </p>
          <ul className="divide-border border-border divide-y rounded-lg border">
            {filteredAndSorted.map((issue) => (
              <IssueRow key={issue.id} issue={issue} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function IssueRow({ issue }: { issue: IssueItem }) {
  return (
    <li
      className="hover:bg-muted/50 flex flex-col gap-2 p-4 transition-colors sm:flex-row sm:items-start sm:justify-between"
      style={{ contentVisibility: "auto", containIntrinsicSize: "auto 72px" }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <span className="text-muted-foreground shrink-0 pt-0.5 text-xs font-medium">
            #{issue.number}
          </span>
          <a
            href={issue.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:text-primary text-sm font-medium transition-colors"
          >
            {issue.title}
          </a>
        </div>

        {issue.labels.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1 pl-6">
            {issue.labels.map((label) => (
              <span
                key={label}
                className="bg-muted text-muted-foreground inline-flex items-center rounded-full px-2 py-0.5 text-xs"
              >
                {label}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-2 flex items-center gap-3 pl-6">
          {issue.difficulty ? (
            <Badge
              variant="outline"
              className={cn(
                "text-xs capitalize",
                DIFFICULTY_STYLES[issue.difficulty],
              )}
            >
              {issue.difficulty.toLowerCase()}
            </Badge>
          ) : null}

          {issue.isGoodFirstIssue ? (
            <Badge variant="secondary" className="text-xs">
              good first issue
            </Badge>
          ) : null}

          <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
            <MessageSquare className="size-3" />
            {issue.commentCount}
          </span>

          <span className="text-muted-foreground text-xs">
            {formatRelativeDate(issue.createdAt)}
          </span>
        </div>
      </div>
    </li>
  );
}

function getFilteredAndSortedIssues(
  issues: IssueItem[],
  difficultyFilter: DifficultyFilter,
  sortOption: SortOption,
  goodFirstIssueOnly: boolean,
): IssueItem[] {
  let result = issues;

  if (difficultyFilter !== "ALL") {
    result = result.filter((issue) => issue.difficulty === difficultyFilter);
  }

  if (goodFirstIssueOnly) {
    result = result.filter((issue) => issue.isGoodFirstIssue);
  }

  // Use toSorted for immutability (rule 7.12)
  return result.toSorted((a, b) => {
    if (sortOption === "newest") {
      const dateA =
        a.createdAt instanceof Date
          ? a.createdAt.getTime()
          : new Date(a.createdAt).getTime();
      const dateB =
        b.createdAt instanceof Date
          ? b.createdAt.getTime()
          : new Date(b.createdAt).getTime();
      return dateB - dateA;
    }
    return a.commentCount - b.commentCount;
  });
}
