import { useMutation, useQuery } from "@tanstack/react-query";
import type { DiscoveryQuery, DiscoveryResult } from "~/lib/discovery/constants";
import type {
  DiscoveryResult as ApiDiscoveryResult,
  RepoMatch,
} from "~/lib/query/types";

function mapRepoToResult(repo: RepoMatch): DiscoveryResult {
  const [owner = "", name = ""] = repo.fullName.split("/");
  return {
    id: repo.id,
    fullName: repo.fullName,
    owner,
    name,
    description: repo.description ?? "",
    stars: repo.stars,
    language: repo.primaryLanguage ?? "",
    topics: repo.topics,
    matchedIssues: repo.matchedIssues.map((issue) => ({
      number: issue.number,
      title: issue.title,
      url: issue.url,
      difficulty: mapDifficulty(issue.difficulty),
      labels: issue.labels,
    })),
  };
}

function mapDifficulty(
  d: string | null,
): "beginner" | "intermediate" | "advanced" {
  switch (d) {
    case "BEGINNER":
      return "beginner";
    case "INTERMEDIATE":
      return "intermediate";
    case "ADVANCED":
      return "advanced";
    default:
      return "intermediate";
  }
}

async function postDiscovery(query: DiscoveryQuery): Promise<DiscoveryResult[]> {
  const response = await fetch("/api/discover", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(query),
  });

  if (!response.ok) {
    throw new Error(`Discovery request failed: ${response.statusText}`);
  }

  const data: ApiDiscoveryResult = await response.json();
  return data.repos.map(mapRepoToResult);
}

async function fetchRepo(id: string): Promise<DiscoveryResult> {
  const response = await fetch(`/api/repos/${id}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch repo: ${response.statusText}`);
  }

  return response.json();
}

interface TrendingTopic {
  name: string;
  count: number;
}

async function fetchTrendingTopics(): Promise<TrendingTopic[]> {
  const response = await fetch("/api/trending");

  if (!response.ok) {
    throw new Error(`Failed to fetch trending topics: ${response.statusText}`);
  }

  return response.json();
}

export function useDiscovery() {
  return useMutation({
    mutationFn: postDiscovery,
  });
}

export function useRepo(id: string) {
  return useQuery({
    queryKey: ["repo", id],
    queryFn: () => fetchRepo(id),
    enabled: !!id,
  });
}

export function useTrendingTopics() {
  return useQuery({
    queryKey: ["trending-topics"],
    queryFn: fetchTrendingTopics,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}
