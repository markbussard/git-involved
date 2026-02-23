import { NextResponse } from "next/server";
import { z } from "zod";
import { RepoSize } from "~/generated/prisma/client";
import { discoverRepositories } from "~/lib/query/discover";
import type { Interest } from "~/lib/query/types";

const VALID_INTERESTS: Interest[] = [
  "web-development",
  "mobile-development",
  "ai-ml",
  "game-development",
  "devops",
  "security",
  "data-science",
  "embedded-systems",
];

const VALID_REPO_SIZES = Object.values(RepoSize);

const discoverRequestSchema = z.object({
  languages: z.array(z.string()).min(1, "At least one language is required"),
  experienceLevel: z.enum(["beginner", "intermediate", "expert"]),
  interests: z
    .array(z.enum(VALID_INTERESTS as [Interest, ...Interest[]]))
    .min(1, "At least one interest is required"),
  repoSizes: z
    .array(
      z.enum(VALID_REPO_SIZES as [RepoSize, ...RepoSize[]]),
    )
    .min(1, "At least one repo size is required"),
  trendingTopics: z.array(z.string()).optional(),
});

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parseResult = discoverRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parseResult.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 },
      );
    }

    const result = await discoverRepositories(parseResult.data);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Discovery API error:", error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
