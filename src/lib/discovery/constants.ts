export const LANGUAGES = [
  { value: "typescript", label: "TypeScript" },
  { value: "javascript", label: "JavaScript" },
  { value: "python", label: "Python" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "java", label: "Java" },
  { value: "csharp", label: "C#" },
  { value: "cpp", label: "C++" },
  { value: "ruby", label: "Ruby" },
  { value: "php", label: "PHP" },
  { value: "swift", label: "Swift" },
  { value: "kotlin", label: "Kotlin" },
] as const;

export const EXPERIENCE_LEVELS = [
  {
    value: "beginner",
    label: "Beginner",
    description: "New to open source or programming",
  },
  {
    value: "intermediate",
    label: "Intermediate",
    description: "Some experience, looking for moderate challenges",
  },
  {
    value: "expert",
    label: "Expert",
    description: "Experienced developer, ready for complex projects",
  },
] as const;

export const INTERESTS = [
  { value: "web-development", label: "Web Development" },
  { value: "mobile-development", label: "Mobile Development" },
  { value: "ai-ml", label: "AI & Machine Learning" },
  { value: "game-development", label: "Game Development" },
  { value: "devops", label: "DevOps & Infrastructure" },
  { value: "security", label: "Security" },
  { value: "data-science", label: "Data Science" },
  { value: "embedded-systems", label: "Embedded Systems" },
] as const;

export const REPO_SIZES = [
  {
    value: "SMALL",
    label: "Small",
    description: "Under 1K stars — easier to navigate and contribute to",
  },
  {
    value: "MEDIUM",
    label: "Medium",
    description: "1K-10K stars — established projects with active communities",
  },
  {
    value: "LARGE",
    label: "Large",
    description:
      "10K-50K stars — major projects with structured contribution processes",
  },
  {
    value: "HUGE",
    label: "Huge",
    description: "50K+ stars — industry-defining projects",
  },
] as const;

export type Language = (typeof LANGUAGES)[number]["value"];
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number]["value"];
export type Interest = (typeof INTERESTS)[number]["value"];
export type RepoSize = (typeof REPO_SIZES)[number]["value"];

export interface DiscoveryQuery {
  languages: Language[];
  experienceLevel: ExperienceLevel;
  interests: Interest[];
  repoSizes: RepoSize[];
}

export interface MatchedIssue {
  number: number;
  title: string;
  url: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  labels: string[];
}

export interface DiscoveryResult {
  id: string;
  fullName: string;
  owner: string;
  name: string;
  description: string;
  stars: number;
  language: string;
  topics: string[];
  matchedIssues: MatchedIssue[];
}
