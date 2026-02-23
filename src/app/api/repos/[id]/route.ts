import { NextResponse } from "next/server";
import { db } from "~/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const repo = await db.repository.findUnique({
      where: { id },
      include: {
        issues: {
          where: { state: "OPEN" },
          orderBy: [{ difficulty: "asc" }, { createdAt: "asc" }],
        },
      },
    });

    if (!repo) {
      return NextResponse.json(
        { error: "Repository not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(repo);
  } catch (error) {
    console.error("Repo detail API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
