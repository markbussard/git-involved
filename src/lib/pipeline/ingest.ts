import { SyncStatus, SyncType } from "~/generated/prisma/client";
import { db } from "~/lib/db";
import {
  fetchRepoIssues,
  fetchRepoLanguages,
  fetchRepoReadme,
  fetchRepositories,
} from "~/lib/github/client";
import type { GitHubIssue, GitHubRepository } from "~/lib/github/client";
import {
  buildIssueEmbeddingText,
  buildRepoEmbeddingText,
  generateEmbedding,
} from "~/lib/pipeline/embeddings";
import { transformIssue, transformRepository } from "~/lib/pipeline/transform";
import {
  upsertIssueEmbedding,
  upsertRepoEmbedding,
} from "~/lib/pipeline/vectordb";
import type {
  IssueVectorMetadata,
  RepoVectorMetadata,
} from "~/lib/pipeline/vectordb";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CONFIGURED_LANGUAGES = [
  "typescript",
  "javascript",
  "python",
  "go",
  "rust",
  "java",
  "csharp",
  "cpp",
  "ruby",
  "php",
  "swift",
  "kotlin",
] as const;

const MIN_STARS = 100;
const MAX_REPOS_PER_LANGUAGE = 25;
const MAX_ISSUES_PER_REPO = 20;
const REPOS_PER_PAGE = 25;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timestamp(): string {
  return new Date().toISOString();
}

function log(context: string, message: string): void {
  console.log(`[${timestamp()}] [${context}] ${message}`);
}

// ---------------------------------------------------------------------------
// Pipeline options
// ---------------------------------------------------------------------------

export interface IngestionOptions {
  dryRun?: boolean;
}

// ---------------------------------------------------------------------------
// Public: Run full ingestion pipeline
// ---------------------------------------------------------------------------

export interface IngestionResult {
  totalRepos: number;
  totalIssues: number;
  errors: string[];
}

/**
 * Run a full ingestion sync across all configured languages.
 *
 * - Searches GitHub for repos in each language with >= MIN_STARS stars.
 * - Fetches README, languages, and open issues for each repo.
 * - Transforms and persists data to Postgres via Prisma.
 * - Generates and stores embeddings in Pinecone.
 * - Records progress in the SyncLog table.
 */
export async function runIngestionPipeline(
  options?: IngestionOptions,
): Promise<IngestionResult> {
  const dryRun = options?.dryRun ?? false;
  const result: IngestionResult = {
    totalRepos: 0,
    totalIssues: 0,
    errors: [],
  };

  log("ingest", `Starting ingestion pipeline (dryRun=${dryRun})`);

  // Create SyncLog entry
  let syncLogId: string | null = null;
  if (!dryRun) {
    const syncLog = await db.syncLog.create({
      data: {
        type: SyncType.FULL,
        status: SyncStatus.RUNNING,
      },
    });
    syncLogId = syncLog.id;
  }

  try {
    for (const language of CONFIGURED_LANGUAGES) {
      log("ingest", `Processing language: ${language}`);
      let reposProcessedForLang = 0;
      let page = 1;

      while (reposProcessedForLang < MAX_REPOS_PER_LANGUAGE) {
        const remaining = MAX_REPOS_PER_LANGUAGE - reposProcessedForLang;
        const perPage = Math.min(REPOS_PER_PAGE, remaining);

        let searchResult;
        try {
          searchResult = await fetchRepositories({
            language,
            minStars: MIN_STARS,
            page,
            perPage,
            sort: "stars",
            order: "desc",
          });
        } catch (err) {
          const errMsg = `Failed to fetch repos for ${language} (page ${page}): ${String(err)}`;
          log("ingest", errMsg);
          result.errors.push(errMsg);
          break;
        }

        if (searchResult.items.length === 0) break;

        for (const ghRepo of searchResult.items) {
          try {
            const issueCount = await processRepository(ghRepo, dryRun);
            result.totalRepos++;
            result.totalIssues += issueCount;
            reposProcessedForLang++;

            if (reposProcessedForLang >= MAX_REPOS_PER_LANGUAGE) break;
          } catch (err) {
            const errMsg = `Failed to process repo ${ghRepo.full_name}: ${String(err)}`;
            log("ingest", errMsg);
            result.errors.push(errMsg);
            // Continue with next repo
          }
        }

        if (!searchResult.hasNextPage) break;
        page++;
      }

      log(
        "ingest",
        `Completed language ${language}: ${reposProcessedForLang} repos`,
      );
    }

    // Update SyncLog with success
    if (syncLogId) {
      await db.syncLog.update({
        where: { id: syncLogId },
        data: {
          status: SyncStatus.COMPLETED,
          completedAt: new Date(),
          reposProcessed: result.totalRepos,
          issuesProcessed: result.totalIssues,
          errors: result.errors,
        },
      });
    }
  } catch (err) {
    const errMsg = `Pipeline fatal error: ${String(err)}`;
    log("ingest", errMsg);
    result.errors.push(errMsg);

    // Update SyncLog with failure
    if (syncLogId) {
      await db.syncLog.update({
        where: { id: syncLogId },
        data: {
          status: SyncStatus.FAILED,
          completedAt: new Date(),
          reposProcessed: result.totalRepos,
          issuesProcessed: result.totalIssues,
          errors: result.errors,
        },
      });
    }
  }

  log(
    "ingest",
    `Pipeline finished. Repos: ${result.totalRepos}, Issues: ${result.totalIssues}, Errors: ${result.errors.length}`,
  );

  return result;
}

// ---------------------------------------------------------------------------
// Process a single repository
// ---------------------------------------------------------------------------

/**
 * Fetch supplementary data for a GitHub repo (README, languages, issues),
 * transform it, persist to Postgres, and upsert embeddings to Pinecone.
 *
 * @returns The number of issues processed for this repo.
 */
export async function processRepository(
  ghRepo: GitHubRepository,
  dryRun = false,
): Promise<number> {
  const { owner, name, full_name } = {
    owner: ghRepo.owner.login,
    name: ghRepo.name,
    full_name: ghRepo.full_name,
  };

  log("ingest", `Processing repo: ${full_name}`);

  // Fetch supplementary data concurrently
  const [readme, languages, ghIssues] = await Promise.all([
    fetchRepoReadme(owner, name),
    fetchRepoLanguages(owner, name),
    fetchRepoIssues(owner, name, { perPage: MAX_ISSUES_PER_REPO }),
  ]);

  // Transform
  const repoData = transformRepository(ghRepo, readme, languages);
  const repoId = repoData.id;

  if (dryRun) {
    log(
      "ingest",
      `[DRY RUN] Would upsert repo ${full_name} with ${ghIssues.length} issues`,
    );
    return ghIssues.length;
  }

  // Generate repo embedding
  const repoEmbeddingText = buildRepoEmbeddingText({
    fullName: repoData.fullName,
    description: repoData.description ?? null,
    primaryLanguage: repoData.primaryLanguage ?? null,
    topics: repoData.topics as string[],
    readme,
  });
  const repoEmbedding = await generateEmbedding(repoEmbeddingText);

  // Upsert repo to Postgres
  await db.repository.upsert({
    where: { id: repoId },
    create: {
      ...repoData,
      embeddingId: repoId,
      embeddingSyncedAt: new Date(),
    },
    update: {
      ...repoData,
      embeddingId: repoId,
      embeddingSyncedAt: new Date(),
      indexedAt: new Date(),
    },
  });

  // Upsert repo embedding to Pinecone
  const repoMeta: RepoVectorMetadata = {
    primaryLanguage: repoData.primaryLanguage ?? "unknown",
    size: repoData.size,
    stars: repoData.stars,
    topics: repoData.topics as string[],
  };
  await upsertRepoEmbedding(repoId, repoEmbedding, repoMeta);

  // Process issues
  let issuesProcessed = 0;
  for (const ghIssue of ghIssues) {
    try {
      await processIssue(ghIssue, repoId);
      issuesProcessed++;
    } catch (err) {
      log(
        "ingest",
        `Failed to process issue #${ghIssue.number} in ${full_name}: ${String(err)}`,
      );
    }
  }

  log(
    "ingest",
    `Completed repo ${full_name}: ${issuesProcessed} issues processed`,
  );

  return issuesProcessed;
}

// ---------------------------------------------------------------------------
// Process a single issue
// ---------------------------------------------------------------------------

/**
 * Transform a GitHub issue, persist it to Postgres, and upsert its
 * embedding to Pinecone.
 */
export async function processIssue(
  ghIssue: GitHubIssue,
  repoId: string,
): Promise<void> {
  const issueData = transformIssue(ghIssue, repoId);
  const issueId = issueData.id;

  // Generate issue embedding
  const issueEmbeddingText = buildIssueEmbeddingText({
    title: issueData.title,
    labels: issueData.labels as string[],
    body: issueData.body ?? null,
  });
  const issueEmbedding = await generateEmbedding(issueEmbeddingText);

  // Upsert issue to Postgres
  await db.issue.upsert({
    where: { id: issueId },
    create: {
      ...issueData,
      embeddingId: issueId,
      embeddingSyncedAt: new Date(),
    },
    update: {
      ...issueData,
      embeddingId: issueId,
      embeddingSyncedAt: new Date(),
      indexedAt: new Date(),
    },
  });

  // Upsert issue embedding to Pinecone
  const issueMeta: IssueVectorMetadata = {
    repoId,
    difficulty: issueData.difficulty ?? "unknown",
    isGoodFirstIssue: issueData.isGoodFirstIssue ?? false,
    labels: issueData.labels as string[],
  };
  await upsertIssueEmbedding(issueId, issueEmbedding, issueMeta);
}
