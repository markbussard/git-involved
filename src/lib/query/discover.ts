import { Difficulty } from "~/generated/prisma/client";
import { db } from "~/lib/db";
import { generateQueryEmbedding } from "~/lib/query/embeddings";
import type {
  DiscoveryQuery,
  DiscoveryResult,
  IssueMatch,
  RepoMatch,
} from "~/lib/query/types";
import { searchIssues, searchRepos } from "~/lib/query/vectordb";

const TOP_REPOS = 20;
const TOP_ISSUES_PER_SEARCH = 50;
const MAX_ISSUES_PER_REPO = 5;

/** Bonus score added per matched issue when ranking repos. */
const ISSUE_AVAILABILITY_BONUS = 0.02;

/**
 * Main discovery function. Takes a user's preferences, performs semantic
 * search across repos and issues, fetches full data from Postgres, and
 * returns ranked results.
 */
export async function discoverRepositories(
  query: DiscoveryQuery,
): Promise<DiscoveryResult> {
  // 1. Generate embedding from user preferences
  const embedding = await generateQueryEmbedding(query);

  // 2. Vector search repos with metadata filters
  const repoResults = await searchRepos({
    embedding,
    topK: TOP_REPOS,
    languages: query.languages,
    sizes: query.repoSizes,
  });

  if (repoResults.length === 0) {
    return { repos: [], query, totalReposSearched: 0 };
  }

  const repoIds = repoResults.map((r) => r.id);
  const repoScoreMap = new Map(repoResults.map((r) => [r.id, r.score]));

  // 3. Vector search issues within matched repos, filtered by experience level
  const issueSearchParams = buildIssueSearchParams(
    embedding,
    repoIds,
    query.experienceLevel,
  );
  const issueResults = await searchIssues(issueSearchParams);

  const issueScoreMap = new Map(issueResults.map((i) => [i.id, i.score]));
  const issueIds = issueResults.map((i) => i.id);

  // 4. Fetch full data from Postgres
  const [repoRows, issueRows] = await Promise.all([
    db.repository.findMany({
      where: { id: { in: repoIds } },
    }),
    issueIds.length > 0
      ? db.issue.findMany({
          where: { id: { in: issueIds }, state: "OPEN" },
        })
      : Promise.resolve([]),
  ]);

  // 5. Group issues by repo
  const issuesByRepo = new Map<string, IssueMatch[]>();
  for (const issue of issueRows) {
    const score = issueScoreMap.get(issue.id) ?? 0;
    const issueMatch: IssueMatch = {
      id: issue.id,
      number: issue.number,
      title: issue.title,
      url: issue.url,
      labels: issue.labels,
      difficulty: issue.difficulty,
      score,
    };

    const existing = issuesByRepo.get(issue.repoId) ?? [];
    existing.push(issueMatch);
    issuesByRepo.set(issue.repoId, existing);
  }

  // Sort issues within each repo by score descending, then take top N
  for (const [repoId, issues] of issuesByRepo) {
    issues.sort((a, b) => b.score - a.score);
    issuesByRepo.set(repoId, issues.slice(0, MAX_ISSUES_PER_REPO));
  }

  // 6. Rank repos by semantic score + issue availability bonus
  const repos: RepoMatch[] = repoRows.map((repo) => {
    const semanticScore = repoScoreMap.get(repo.id) ?? 0;
    const matchedIssues = issuesByRepo.get(repo.id) ?? [];
    const issueBonus = matchedIssues.length * ISSUE_AVAILABILITY_BONUS;

    return {
      id: repo.id,
      fullName: repo.fullName,
      description: repo.description,
      url: repo.url,
      stars: repo.stars,
      primaryLanguage: repo.primaryLanguage,
      topics: repo.topics,
      size: repo.size,
      score: semanticScore + issueBonus,
      matchedIssues,
    };
  });

  repos.sort((a, b) => b.score - a.score);

  // 7. Return results
  return {
    repos,
    query,
    totalReposSearched: repoResults.length,
  };
}

function buildIssueSearchParams(
  embedding: number[],
  repoIds: string[],
  experienceLevel: DiscoveryQuery["experienceLevel"],
) {
  const base = {
    embedding,
    topK: TOP_ISSUES_PER_SEARCH,
    repoIds,
  };

  switch (experienceLevel) {
    case "beginner":
      return { ...base, isGoodFirstIssue: true };
    case "intermediate":
      return {
        ...base,
        difficulties: [Difficulty.BEGINNER, Difficulty.INTERMEDIATE],
      };
    case "expert":
      // No difficulty filter for experts
      return base;
  }
}
