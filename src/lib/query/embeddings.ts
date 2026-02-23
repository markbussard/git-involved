import OpenAI from "openai";

import type { DiscoveryQuery, Interest } from "~/lib/query/types";

const INTEREST_KEYWORDS: Record<Interest, string> = {
  "web-development":
    "web development, frontend, backend, full-stack, React, Vue, Node.js, APIs",
  "mobile-development":
    "mobile development, iOS, Android, React Native, Flutter",
  "ai-ml":
    "artificial intelligence, machine learning, deep learning, NLP, computer vision",
  "game-development": "game development, game engine, graphics, Unity, Unreal",
  devops: "DevOps, CI/CD, containers, Kubernetes, Docker, infrastructure",
  security:
    "security, cryptography, authentication, vulnerability, penetration testing",
  "data-science": "data science, analytics, visualization, pandas, statistics",
  "embedded-systems":
    "embedded systems, IoT, firmware, hardware, microcontrollers",
};

const EXPERIENCE_DESCRIPTIONS: Record<
  DiscoveryQuery["experienceLevel"],
  string
> = {
  beginner:
    "beginner-friendly, well-documented, simple codebase, good first issues",
  intermediate:
    "moderate complexity, some experience required, established patterns",
  expert: "complex architecture, advanced patterns, deep domain knowledge",
};

/**
 * Convert a user's discovery preferences into a natural language text
 * suitable for generating a semantic embedding.
 */
export function buildQueryText(query: DiscoveryQuery): string {
  const parts: string[] = [];

  if (query.languages.length > 0) {
    parts.push(`Programming languages: ${query.languages.join(", ")}.`);
  }

  if (query.interests.length > 0) {
    const interestDescriptions = query.interests
      .map((interest) => INTEREST_KEYWORDS[interest])
      .join("; ");
    parts.push(`Interests: ${interestDescriptions}.`);
  }

  parts.push(
    `Experience level: ${EXPERIENCE_DESCRIPTIONS[query.experienceLevel]}.`,
  );

  if (query.trendingTopics && query.trendingTopics.length > 0) {
    parts.push(`Trending topics: ${query.trendingTopics.join(", ")}.`);
  }

  return parts.join(" ");
}

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

/**
 * Generate a vector embedding for a discovery query using OpenAI
 * text-embedding-3-small.
 */
export async function generateQueryEmbedding(
  query: DiscoveryQuery,
): Promise<number[]> {
  const text = buildQueryText(query);
  const client = getOpenAIClient();

  const response = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });

  return response.data[0].embedding;
}
