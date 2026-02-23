import { NextResponse } from "next/server";

import { Octokit } from "@octokit/rest";

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

const FALLBACK_TOPICS = [
  "machine-learning",
  "typescript",
  "react",
  "rust",
  "web-assembly",
  "kubernetes",
  "graphql",
  "next-js",
  "tailwindcss",
  "open-source",
  "cli",
  "developer-tools",
  "ai",
  "llm",
  "blockchain",
];

interface CacheEntry {
  topics: string[];
  fetchedAt: number;
}

let cache: CacheEntry | null = null;

function isCacheValid(): boolean {
  if (!cache) return false;
  return Date.now() - cache.fetchedAt < CACHE_TTL_MS;
}

/**
 * Fetch trending topics from GitHub by searching recently-created repos
 * sorted by stars, then extracting the most common topics.
 */
async function fetchTrendingTopics(): Promise<string[]> {
  try {
    const octokit = new Octokit();

    // Search for repos created in the last 7 days with the most stars
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const dateStr = oneWeekAgo.toISOString().split("T")[0];

    const response = await octokit.search.repos({
      q: `created:>${dateStr} stars:>50`,
      sort: "stars",
      order: "desc",
      per_page: 50,
    });

    // Count topic frequency across trending repos
    const topicCounts = new Map<string, number>();
    for (const repo of response.data.items) {
      for (const topic of repo.topics ?? []) {
        topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1);
      }
    }

    // Sort by frequency and return the top topics
    const sorted = [...topicCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([topic]) => topic);

    return sorted.length > 0 ? sorted : FALLBACK_TOPICS;
  } catch (error) {
    console.error("Failed to fetch trending topics from GitHub:", error);
    return FALLBACK_TOPICS;
  }
}

export async function GET() {
  try {
    if (isCacheValid()) {
      return NextResponse.json({ topics: cache!.topics });
    }

    const topics = await fetchTrendingTopics();

    cache = { topics, fetchedAt: Date.now() };

    return NextResponse.json({ topics });
  } catch (error) {
    console.error("Trending API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
