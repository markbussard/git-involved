import {
  RepoSize,
  IssueState,
  Difficulty,
} from "~/generated/prisma/client";
import type { GitHubRepository, GitHubIssue } from "~/lib/github/client";
import type { RepositoryCreateInput } from "~/generated/prisma/models/Repository";
import type { IssueUncheckedCreateInput } from "~/generated/prisma/models/Issue";

// ---------------------------------------------------------------------------
// Repo Size
// ---------------------------------------------------------------------------

/**
 * Map a star count to a `RepoSize` enum value.
 *
 * - SMALL:  < 1 000 stars
 * - MEDIUM: 1 000 -- 10 000 stars
 * - LARGE:  10 000 -- 50 000 stars
 * - HUGE:   50 000+ stars
 */
export function calculateRepoSize(stars: number): RepoSize {
  if (stars < 1_000) return RepoSize.SMALL;
  if (stars < 10_000) return RepoSize.MEDIUM;
  if (stars < 50_000) return RepoSize.LARGE;
  return RepoSize.HUGE;
}

// ---------------------------------------------------------------------------
// Difficulty inference
// ---------------------------------------------------------------------------

const BEGINNER_LABELS = new Set([
  "good first issue",
  "beginner",
  "easy",
  "starter",
  "good-first-issue",
  "beginner-friendly",
  "first-timers-only",
  "low-hanging-fruit",
]);

const INTERMEDIATE_LABELS = new Set([
  "help wanted",
  "medium",
  "help-wanted",
  "intermediate",
]);

const ADVANCED_LABELS = new Set([
  "advanced",
  "hard",
  "complex",
  "expert",
]);

/**
 * Infer the `Difficulty` for an issue based on its label names.
 * Returns `null` when no recognisable label is present.
 */
export function inferDifficulty(labels: string[]): Difficulty | null {
  const normalised = labels.map((l) => l.toLowerCase().trim());

  for (const label of normalised) {
    if (BEGINNER_LABELS.has(label)) return Difficulty.BEGINNER;
  }
  for (const label of normalised) {
    if (ADVANCED_LABELS.has(label)) return Difficulty.ADVANCED;
  }
  for (const label of normalised) {
    if (INTERMEDIATE_LABELS.has(label)) return Difficulty.INTERMEDIATE;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Repository transform
// ---------------------------------------------------------------------------

/**
 * Convert a GitHub API repository object into the shape expected by
 * `prisma.repository.create({ data: ... })`.
 */
export function transformRepository(
  ghRepo: GitHubRepository,
  readme: string | null,
  languages: Record<string, number>,
): Omit<RepositoryCreateInput, "issues"> {
  const languageNames = Object.keys(languages);

  return {
    id: String(ghRepo.id),
    name: ghRepo.name,
    fullName: ghRepo.full_name,
    description: ghRepo.description,
    url: ghRepo.html_url,
    stars: ghRepo.stargazers_count,
    forks: ghRepo.forks_count,
    openIssuesCount: ghRepo.open_issues_count,
    primaryLanguage: ghRepo.language,
    languages: languageNames,
    topics: ghRepo.topics ?? [],
    license: ghRepo.license?.spdx_id ?? null,
    createdAt: new Date(ghRepo.created_at),
    updatedAt: new Date(ghRepo.updated_at),
    pushedAt: new Date(ghRepo.pushed_at),
    size: calculateRepoSize(ghRepo.stargazers_count),
    readme,
    healthScore: calculateHealthScore({
      pushedAt: ghRepo.pushed_at,
      openIssuesCount: ghRepo.open_issues_count,
      stargazersCount: ghRepo.stargazers_count,
      hasReadme: readme !== null && readme.length > 0,
      hasLicense: ghRepo.license?.spdx_id !== null && ghRepo.license?.spdx_id !== undefined,
      hasDescription: ghRepo.description !== null && ghRepo.description.length > 0,
    }),
  };
}

// ---------------------------------------------------------------------------
// Issue transform
// ---------------------------------------------------------------------------

/**
 * Convert a GitHub API issue object into the shape expected by
 * `prisma.issue.create({ data: ... })`.
 */
export function transformIssue(
  ghIssue: GitHubIssue,
  repoId: string,
): IssueUncheckedCreateInput {
  const labelNames = ghIssue.labels
    .map((l) => l.name)
    .filter((name): name is string => name !== undefined);

  const difficulty = inferDifficulty(labelNames);
  const isGoodFirstIssue = labelNames.some((l) =>
    BEGINNER_LABELS.has(l.toLowerCase().trim()),
  );

  return {
    id: String(ghIssue.id),
    number: ghIssue.number,
    title: ghIssue.title,
    body: ghIssue.body,
    url: ghIssue.html_url,
    state: ghIssue.state === "open" ? IssueState.OPEN : IssueState.CLOSED,
    labels: labelNames,
    commentCount: ghIssue.comments,
    createdAt: new Date(ghIssue.created_at),
    updatedAt: new Date(ghIssue.updated_at),
    difficulty,
    isGoodFirstIssue,
    repoId,
  };
}

// ---------------------------------------------------------------------------
// Health Score
// ---------------------------------------------------------------------------

interface HealthScoreInput {
  pushedAt: string;
  openIssuesCount: number;
  stargazersCount: number;
  hasReadme: boolean;
  hasLicense: boolean;
  hasDescription: boolean;
}

/**
 * Produce a 0--100 health score for a repository.
 *
 * Factors (weighted):
 *   - Commit recency         (40 %) -- how recently the repo was pushed to
 *   - Issue response ratio   (20 %) -- open issues relative to stars
 *   - Documentation quality  (40 %) -- presence of README, license, description
 */
export function calculateHealthScore(repo: HealthScoreInput): number {
  // --- Commit recency (0-40) ---
  const daysSincePush = Math.max(
    0,
    (Date.now() - new Date(repo.pushedAt).getTime()) / (1000 * 60 * 60 * 24),
  );
  let recencyScore: number;
  if (daysSincePush <= 7) recencyScore = 40;
  else if (daysSincePush <= 30) recencyScore = 35;
  else if (daysSincePush <= 90) recencyScore = 25;
  else if (daysSincePush <= 180) recencyScore = 15;
  else if (daysSincePush <= 365) recencyScore = 8;
  else recencyScore = 2;

  // --- Issue ratio (0-20) ---
  // A low ratio of open issues to stars suggests good maintainer responsiveness.
  let issueScore = 20;
  if (repo.stargazersCount > 0) {
    const ratio = repo.openIssuesCount / repo.stargazersCount;
    if (ratio > 0.5) issueScore = 4;
    else if (ratio > 0.2) issueScore = 8;
    else if (ratio > 0.1) issueScore = 12;
    else if (ratio > 0.05) issueScore = 16;
  }

  // --- Documentation quality (0-40) ---
  let docsScore = 0;
  if (repo.hasReadme) docsScore += 20;
  if (repo.hasLicense) docsScore += 10;
  if (repo.hasDescription) docsScore += 10;

  return Math.round(recencyScore + issueScore + docsScore);
}
