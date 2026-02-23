import { Octokit } from "@octokit/rest";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SearchReposParams {
  language?: string;
  minStars?: number;
  topic?: string;
  page?: number;
  perPage?: number;
  sort?: "stars" | "forks" | "updated";
  order?: "asc" | "desc";
}

export interface SearchReposResult {
  totalCount: number;
  items: GitHubRepository[];
  hasNextPage: boolean;
}

/** Simplified shape returned by the GitHub Search API. */
export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  language: string | null;
  topics: string[];
  license: { spdx_id: string | null } | null;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  owner: { login: string };
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  state: string;
  labels: Array<{ name?: string }>;
  comments: number;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// In-memory cache for trending topics (15 min TTL)
// ---------------------------------------------------------------------------

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const TRENDING_CACHE_TTL_MS = 15 * 60 * 1000;
let trendingCache: CacheEntry<string[]> | null = null;

// ---------------------------------------------------------------------------
// Rate-limit aware retry helper
// ---------------------------------------------------------------------------

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000;

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;

      const status =
        error instanceof Object && "status" in error
          ? (error as { status: number }).status
          : undefined;

      // Retry on rate-limit (403 / 429) and server errors (5xx)
      const isRetryable =
        status === 403 || status === 429 || (status !== undefined && status >= 500);

      if (!isRetryable || attempt === MAX_RETRIES - 1) {
        throw error;
      }

      // Check for Retry-After header value
      let delayMs = BASE_DELAY_MS * Math.pow(2, attempt);
      if (
        error instanceof Object &&
        "response" in error &&
        (error as { response: { headers: Record<string, string> } }).response?.headers?.[
          "retry-after"
        ]
      ) {
        const retryAfter = Number(
          (error as { response: { headers: Record<string, string> } }).response.headers[
            "retry-after"
          ],
        );
        if (!Number.isNaN(retryAfter)) {
          delayMs = retryAfter * 1000;
        }
      }

      console.log(
        `[github] Rate limited / server error (status=${status}). Retrying in ${delayMs}ms (attempt ${attempt + 1}/${MAX_RETRIES})`,
      );
      await sleep(delayMs);
    }
  }

  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Search GitHub repositories by language, minimum stars, and/or topic.
 * Returns paginated results (default 30 per page, max 100).
 */
export async function fetchRepositories(
  params: SearchReposParams,
): Promise<SearchReposResult> {
  const {
    language,
    minStars = 0,
    topic,
    page = 1,
    perPage = 30,
    sort = "stars",
    order = "desc",
  } = params;

  const qualifiers: string[] = [];
  if (language) qualifiers.push(`language:${language}`);
  if (minStars > 0) qualifiers.push(`stars:>=${minStars}`);
  if (topic) qualifiers.push(`topic:${topic}`);

  const q = qualifiers.length > 0 ? qualifiers.join(" ") : "stars:>=100";

  const response = await withRetry(() =>
    octokit.rest.search.repos({
      q,
      sort,
      order,
      per_page: perPage,
      page,
    }),
  );

  const totalCount = response.data.total_count;
  const items = response.data.items as unknown as GitHubRepository[];
  const hasNextPage = page * perPage < totalCount;

  return { totalCount, items, hasNextPage };
}

/**
 * Fetch the README content for a repository (decoded from base64).
 * Returns null if no README is found.
 */
export async function fetchRepoReadme(
  owner: string,
  repo: string,
): Promise<string | null> {
  try {
    const response = await withRetry(() =>
      octokit.rest.repos.getReadme({ owner, repo }),
    );

    const content = (response.data as { content?: string }).content;
    if (!content) return null;

    return Buffer.from(content, "base64").toString("utf-8");
  } catch (error: unknown) {
    const status =
      error instanceof Object && "status" in error
        ? (error as { status: number }).status
        : undefined;

    if (status === 404) return null;
    throw error;
  }
}

/**
 * Fetch open issues for a repository, including labels.
 * Returns up to `perPage` issues (max 100 per request).
 */
export async function fetchRepoIssues(
  owner: string,
  repo: string,
  options?: { page?: number; perPage?: number },
): Promise<GitHubIssue[]> {
  const { page = 1, perPage = 100 } = options ?? {};

  const response = await withRetry(() =>
    octokit.rest.issues.listForRepo({
      owner,
      repo,
      state: "open",
      per_page: perPage,
      page,
      sort: "updated",
      direction: "desc",
    }),
  );

  // The Issues API also returns pull requests -- filter them out.
  return (response.data as unknown as (GitHubIssue & { pull_request?: unknown })[]).filter(
    (issue) => !("pull_request" in issue && issue.pull_request),
  );
}

/**
 * Fetch all languages used in a repository.
 * Returns an object mapping language names to byte counts.
 */
export async function fetchRepoLanguages(
  owner: string,
  repo: string,
): Promise<Record<string, number>> {
  const response = await withRetry(() =>
    octokit.rest.repos.listLanguages({ owner, repo }),
  );

  return response.data as Record<string, number>;
}

/**
 * Fetch trending topics from GitHub.
 * Results are cached in-memory for 15 minutes.
 */
export async function fetchTrendingTopics(): Promise<string[]> {
  if (trendingCache && Date.now() < trendingCache.expiresAt) {
    return trendingCache.data;
  }

  // GitHub doesn't expose a "trending topics" endpoint directly.
  // We approximate by searching for recently-created repos with high stars
  // and extracting their most common topics.
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const response = await withRetry(() =>
    octokit.rest.search.repos({
      q: `created:>=${oneWeekAgo} stars:>=50`,
      sort: "stars",
      order: "desc",
      per_page: 100,
    }),
  );

  const topicCounts = new Map<string, number>();
  for (const repo of response.data.items) {
    for (const topic of (repo as unknown as GitHubRepository).topics ?? []) {
      topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1);
    }
  }

  const topics = [...topicCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([topic]) => topic);

  trendingCache = {
    data: topics,
    expiresAt: Date.now() + TRENDING_CACHE_TTL_MS,
  };

  return topics;
}
