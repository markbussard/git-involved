# Git-Involved - Agent Instructions

## Package Manager
Always use **pnpm** — never npm or yarn.

## Tech Stack
- **Framework:** Next.js 16+ (App Router)
- **Language:** TypeScript (strict, no `any` types)
- **Styling:** TailwindCSS v4 + ShadCN UI (base-nova style, using @base-ui/react primitives)
- **Database:** PostgreSQL via Prisma ORM
- **Vector DB:** Pinecone
- **Embeddings:** OpenAI text-embedding-3-small
- **Data Fetching:** TanStack Query
- **GitHub API:** Octokit
- **Validation:** Zod

## Project Structure
```
src/
  app/              # Next.js App Router pages and API routes
  components/
    ui/             # ShadCN components (auto-generated, don't edit)
    discovery/      # Discovery flow components
    repo/           # Repository detail components
    layout/         # Header, footer, shared layout
  lib/
    db/             # Prisma client singleton
    github/         # GitHub API client (Octokit)
    pipeline/       # Data ingestion pipeline
    query/          # Discovery query layer
    api/            # TanStack Query hooks
    discovery/      # Constants and configuration
    utils.ts        # Shared utilities
  scripts/          # CLI scripts (ingestion, cleanup)
prisma/             # Prisma schema and migrations
```

## Path Aliases
Use `~/` for imports from `src/`:
```typescript
import { cn } from "~/lib/utils"
import { Button } from "~/components/ui/button"
```

## TailwindCSS v4
This project uses Tailwind v4 with CSS-based configuration (no tailwind.config.js).
- Theme is defined in `src/app/globals.css` via `@theme inline` and CSS custom properties
- Dark mode uses `@custom-variant dark (&:is(.dark *))` convention
- Use ShadCN design tokens (e.g., `bg-background`, `text-foreground`, `bg-card`, `text-muted-foreground`)

## Database
- Local dev uses Docker Compose (`docker-compose.yml`) with PostgreSQL 16
- Connection: `postgresql://git_involved:git_involved@localhost:5432/git_involved`
- Run `pnpm db:push` to sync schema, `pnpm db:studio` to open Prisma Studio
- **Prisma 7**: Uses driver adapter pattern (`@prisma/adapter-pg`), no `url` in schema datasource
- **Naming**: Use `@map("snake_case")` for fields and `@@map("table_name")` for models to keep DB columns snake_case while TypeScript stays camelCase
- Generated client output: `src/generated/prisma` (gitignored)

## Key Commands
```bash
pnpm dev              # Start dev server
pnpm build            # Production build
pnpm lint             # ESLint
pnpm db:push          # Push Prisma schema to database
pnpm db:studio        # Open Prisma Studio
pnpm db:generate      # Generate Prisma client
pnpm ingest           # Run data ingestion pipeline
pnpm ingest:dry-run   # Dry-run ingestion
```

## Coding Conventions
- Use server components by default; add `"use client"` only when needed
- Validate API inputs with Zod schemas
- Use proper TypeScript types, no `any`
- Follow existing ShadCN component patterns for custom UI
- Keep components focused — one component per file
- Colocate types with their module when possible
