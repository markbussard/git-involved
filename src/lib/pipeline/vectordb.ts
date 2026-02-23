import { Pinecone } from "@pinecone-database/pinecone";
import type { RepoSize } from "~/generated/prisma/client";

// ---------------------------------------------------------------------------
// Client singleton
// ---------------------------------------------------------------------------

let pineconeClient: Pinecone | null = null;

function getPinecone(): Pinecone {
  if (!pineconeClient) {
    pineconeClient = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
  }
  return pineconeClient;
}

// ---------------------------------------------------------------------------
// Index helpers
// ---------------------------------------------------------------------------

function getRepoIndex() {
  return getPinecone().index(process.env.PINECONE_REPO_INDEX!);
}

function getIssueIndex() {
  return getPinecone().index(process.env.PINECONE_ISSUE_INDEX!);
}

// ---------------------------------------------------------------------------
// Metadata types
// ---------------------------------------------------------------------------

export interface RepoVectorMetadata {
  primaryLanguage: string;
  size: RepoSize;
  stars: number;
  topics: string[];
}

export interface IssueVectorMetadata {
  repoId: string;
  difficulty: string;
  isGoodFirstIssue: boolean;
  labels: string[];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Upsert a repository embedding into the Pinecone repo index.
 */
export async function upsertRepoEmbedding(
  id: string,
  embedding: number[],
  metadata: RepoVectorMetadata,
): Promise<void> {
  const index = getRepoIndex();
  await index.upsert([
    {
      id,
      values: embedding,
      metadata: {
        primaryLanguage: metadata.primaryLanguage,
        size: metadata.size,
        stars: metadata.stars,
        topics: metadata.topics,
      },
    },
  ]);
}

/**
 * Upsert an issue embedding into the Pinecone issue index.
 */
export async function upsertIssueEmbedding(
  id: string,
  embedding: number[],
  metadata: IssueVectorMetadata,
): Promise<void> {
  const index = getIssueIndex();
  await index.upsert([
    {
      id,
      values: embedding,
      metadata: {
        repoId: metadata.repoId,
        difficulty: metadata.difficulty,
        isGoodFirstIssue: metadata.isGoodFirstIssue,
        labels: metadata.labels,
      },
    },
  ]);
}

/**
 * Delete a single repository embedding from the Pinecone repo index.
 */
export async function deleteRepoEmbedding(id: string): Promise<void> {
  const index = getRepoIndex();
  await index.deleteOne(id);
}

/**
 * Bulk-delete issue embeddings from the Pinecone issue index.
 */
export async function deleteIssueEmbeddings(ids: string[]): Promise<void> {
  if (ids.length === 0) return;

  const index = getIssueIndex();
  await index.deleteMany(ids);
}
