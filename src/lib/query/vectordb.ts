import { Pinecone } from "@pinecone-database/pinecone";
import type { Difficulty, RepoSize } from "~/generated/prisma/client";

let pineconeClient: Pinecone | null = null;

function getPineconeClient(): Pinecone {
  if (!pineconeClient) {
    pineconeClient = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
  }
  return pineconeClient;
}

export interface RepoSearchParams {
  embedding: number[];
  topK: number;
  languages?: string[];
  sizes?: RepoSize[];
}

export interface IssueSearchParams {
  embedding: number[];
  topK: number;
  repoIds: string[];
  difficulties?: Difficulty[];
  isGoodFirstIssue?: boolean;
}

export interface VectorSearchResult {
  id: string;
  score: number;
}

/**
 * Search the repo embeddings index with optional metadata filters
 * on primaryLanguage and size.
 */
export async function searchRepos(
  params: RepoSearchParams,
): Promise<VectorSearchResult[]> {
  const client = getPineconeClient();
  const index = client.index(process.env.PINECONE_REPO_INDEX!);

  const filter: Record<string, unknown> = {};

  if (params.languages && params.languages.length > 0) {
    filter.primaryLanguage = { $in: params.languages };
  }

  if (params.sizes && params.sizes.length > 0) {
    filter.size = { $in: params.sizes };
  }

  const results = await index.query({
    vector: params.embedding,
    topK: params.topK,
    filter: Object.keys(filter).length > 0 ? filter : undefined,
    includeMetadata: false,
  });

  return (results.matches ?? []).map((match) => ({
    id: match.id,
    score: match.score ?? 0,
  }));
}

/**
 * Search the issue embeddings index filtered by repoIds and optionally
 * by difficulty level and good-first-issue flag.
 */
export async function searchIssues(
  params: IssueSearchParams,
): Promise<VectorSearchResult[]> {
  const client = getPineconeClient();
  const index = client.index(process.env.PINECONE_ISSUE_INDEX!);

  const filter: Record<string, unknown> = {};

  if (params.repoIds.length > 0) {
    filter.repoId = { $in: params.repoIds };
  }

  if (params.difficulties && params.difficulties.length > 0) {
    filter.difficulty = { $in: params.difficulties };
  }

  if (params.isGoodFirstIssue !== undefined) {
    filter.isGoodFirstIssue = params.isGoodFirstIssue;
  }

  const results = await index.query({
    vector: params.embedding,
    topK: params.topK,
    filter: Object.keys(filter).length > 0 ? filter : undefined,
    includeMetadata: false,
  });

  return (results.matches ?? []).map((match) => ({
    id: match.id,
    score: match.score ?? 0,
  }));
}
