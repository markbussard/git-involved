import { useMutation, useQuery } from "@tanstack/react-query";
import type { DiscoveryQuery, DiscoveryResult } from "~/lib/discovery/constants";

async function postDiscovery(query: DiscoveryQuery): Promise<DiscoveryResult[]> {
  const response = await fetch("/api/discover", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(query),
  });

  if (!response.ok) {
    throw new Error(`Discovery request failed: ${response.statusText}`);
  }

  return response.json();
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
