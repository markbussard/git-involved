import type { Difficulty, RepoSize } from "~/generated/prisma/client";

export interface DiscoveryQuery {
  languages: string[];
  experienceLevel: "beginner" | "intermediate" | "expert";
  interests: Interest[];
  repoSizes: RepoSize[];
  trendingTopics?: string[];
}

export type Interest =
  | "web-development"
  | "mobile-development"
  | "ai-ml"
  | "game-development"
  | "devops"
  | "security"
  | "data-science"
  | "embedded-systems";

export interface RepoMatch {
  id: string;
  fullName: string;
  description: string | null;
  url: string;
  stars: number;
  primaryLanguage: string | null;
  topics: string[];
  size: RepoSize;
  score: number;
  matchedIssues: IssueMatch[];
}

export interface IssueMatch {
  id: string;
  number: number;
  title: string;
  url: string;
  labels: string[];
  difficulty: Difficulty | null;
  score: number;
}

export interface DiscoveryResult {
  repos: RepoMatch[];
  query: DiscoveryQuery;
  totalReposSearched: number;
}
