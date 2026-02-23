import OpenAI from "openai";

// ---------------------------------------------------------------------------
// Client singleton
// ---------------------------------------------------------------------------

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EMBEDDING_MODEL = "text-embedding-3-small";
const MAX_INPUT_CHARS = 8_000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RepoEmbeddingInput {
  fullName: string;
  description: string | null;
  primaryLanguage: string | null;
  topics: string[];
  readme: string | null;
}

export interface IssueEmbeddingInput {
  title: string;
  labels: string[];
  body: string | null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a vector embedding for the given text using OpenAI
 * `text-embedding-3-small`. Input is truncated to 8 000 characters.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const client = getOpenAIClient();
  const truncated = text.slice(0, MAX_INPUT_CHARS);

  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: truncated,
  });

  return response.data[0].embedding;
}

/**
 * Build the text payload that will be embedded for a repository.
 *
 * Format:
 * ```
 * {fullName}
 * {description}
 * Language: {primaryLanguage}
 * Topics: {topics}
 * README:
 * {readme}
 * ```
 */
export function buildRepoEmbeddingText(repo: RepoEmbeddingInput): string {
  const parts: string[] = [repo.fullName];

  if (repo.description) {
    parts.push(repo.description);
  }

  if (repo.primaryLanguage) {
    parts.push(`Language: ${repo.primaryLanguage}`);
  }

  if (repo.topics.length > 0) {
    parts.push(`Topics: ${repo.topics.join(", ")}`);
  }

  if (repo.readme) {
    parts.push(`README:\n${repo.readme}`);
  }

  return parts.join("\n");
}

/**
 * Build the text payload that will be embedded for an issue.
 *
 * Format:
 * ```
 * {title}
 * Labels: {labels}
 * {body}
 * ```
 */
export function buildIssueEmbeddingText(issue: IssueEmbeddingInput): string {
  const parts: string[] = [issue.title];

  if (issue.labels.length > 0) {
    parts.push(`Labels: ${issue.labels.join(", ")}`);
  }

  if (issue.body) {
    parts.push(issue.body);
  }

  return parts.join("\n");
}
