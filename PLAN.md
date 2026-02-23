# Git-Involved: Implementation Plan

## Project Overview

**Git-Involved** is an AI-powered GitHub repository discovery platform that helps developers find open source contribution opportunities matching their skills, experience level, and interests.

### Core Value Proposition

- Match developers with repositories based on languages, interests, and experience level
- Surface relevant issues (especially "good first issues") appropriate for the user's skill level
- Provide repository health insights and contributor-friendly metrics

### Tech Stack

| Layer           | Technology                                          |
| --------------- | --------------------------------------------------- |
| Framework       | Next.js 16+ (App Router)                            |
| Language        | TypeScript                                          |
| Styling         | TailwindCSS + ShadCN UI                             |
| Database        | PostgreSQL                                          |
| ORM             | Prisma                                              |
| Vector Database | Pinecone                                            |
| Embeddings      | OpenAI text-embedding-3-small                       |
| Data Fetching   | TanStack Query                                      |
| External APIs   | GitHub REST API (Octokit)                           |
| Deployment      | Vercel (application), separate worker for ingestion |

---

## Phase 1: Project Foundation

**Goal:** Set up the development environment, database schema, and core infrastructure.

### 1.1 Project Initialization

**Tasks:**

1. Initialize Next.js project with TypeScript
   ```bash
   npx create-next-app@latest git-involved --typescript --tailwind --eslint --app --src-dir
   ```

2. Install core dependencies
   ```bash
   # Core
   npm install @prisma/client @tanstack/react-query zod
   
   # UI
   npm install tailwindcss-animate class-variance-authority clsx tailwind-merge lucide-react
   npx shadcn@latest init
   
   # GitHub & AI
   npm install @octokit/rest openai @pinecone-database/pinecone
   
   # Dev dependencies
   npm install -D prisma tsx
   ```

3. Configure ShadCN components
   ```bash
   npx shadcn@latest add button card badge input label select checkbox
   ```

4. Set up project structure
   ```
   /src
     /app
       /page.tsx
       /discover/page.tsx
       /repo/[owner]/[name]/page.tsx
       /api
         /discover/route.ts
         /repos/[id]/route.ts
         /trending/route.ts
     /components
       /ui (ShadCN components)
       /discovery
       /repo
       /layout
     /lib
       /db/index.ts
       /github/client.ts
       /pipeline
         /ingest.ts
         /transform.ts
         /embeddings.ts
       /query
         /discover.ts
         /embeddings.ts
         /vectordb.ts
         /types.ts
       /api/hooks.ts
       /utils.ts
     /scripts
       /run-ingestion.ts
       /cleanup-stale.ts
   /prisma
     /schema.prisma
   ```

5. Configure environment variables
   ```env
   # .env.example
   DATABASE_URL="postgresql://..."
   GITHUB_TOKEN="ghp_..."
   OPENAI_API_KEY="sk-..."
   PINECONE_API_KEY="..."
   PINECONE_REPO_INDEX="git-involved-repos"
   PINECONE_ISSUE_INDEX="git-involved-issues"
   ```

### 1.2 Database Schema

**File:** `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Repository {
  id                String   @id
  name              String
  fullName          String   @unique
  description       String?
  url               String
  stars             Int
  forks             Int
  openIssuesCount   Int
  primaryLanguage   String?
  languages         String[]
  topics            String[]
  license           String?
  createdAt         DateTime
  updatedAt         DateTime
  pushedAt          DateTime
  
  size              RepoSize
  readme            String?
  healthScore       Float?
  
  indexedAt         DateTime @default(now())
  embeddingId       String?
  embeddingSyncedAt DateTime?

  issues            Issue[]

  @@index([primaryLanguage])
  @@index([size])
  @@index([stars])
  @@index([indexedAt])
}

model Issue {
  id               String      @id
  number           Int
  title            String
  body             String?
  url              String
  state            IssueState
  labels           String[]
  commentCount     Int
  createdAt        DateTime
  updatedAt        DateTime
  
  difficulty       Difficulty?
  isGoodFirstIssue Boolean     @default(false)
  
  indexedAt         DateTime   @default(now())
  embeddingId       String?
  embeddingSyncedAt DateTime?

  repoId           String
  repository       Repository  @relation(fields: [repoId], references: [id], onDelete: Cascade)

  @@index([repoId])
  @@index([state])
  @@index([isGoodFirstIssue])
  @@index([difficulty])
  @@index([indexedAt])
}

model SyncLog {
  id          String   @id @default(cuid())
  type        SyncType
  status      SyncStatus
  startedAt   DateTime @default(now())
  completedAt DateTime?
  reposProcessed Int    @default(0)
  issuesProcessed Int   @default(0)
  errors      String[]
  
  @@index([type, status])
  @@index([startedAt])
}

enum RepoSize {
  SMALL
  MEDIUM
  LARGE
  HUGE
}

enum IssueState {
  OPEN
  CLOSED
}

enum Difficulty {
  BEGINNER
  INTERMEDIATE
  ADVANCED
}

enum SyncType {
  FULL
  INCREMENTAL
  ISSUES_ONLY
}

enum SyncStatus {
  RUNNING
  COMPLETED
  FAILED
}
```

**Tasks:**

1. Create schema file as shown above
2. Run initial migration: `npx prisma migrate dev --name init`
3. Generate Prisma client: `npx prisma generate`
4. Create database client singleton in `src/lib/db/index.ts`

### 1.3 Vector Database Setup

**Tasks:**

1. Create Pinecone account and project
2. Create two indexes:
   - `git-involved-repos` (dimension: 1536 for text-embedding-3-small)
   - `git-involved-issues` (dimension: 1536)
3. Configure metadata filtering fields:
   - Repos: `primaryLanguage`, `size`, `stars`, `topics`
   - Issues: `repoId`, `difficulty`, `isGoodFirstIssue`, `labels`

---

## Phase 2: Data Ingestion Pipeline

**Goal:** Build the pipeline to fetch GitHub data, generate embeddings, and sync to both databases.

### 2.1 GitHub Client

**File:** `src/lib/github/client.ts`

**Functionality:**

1. `fetchRepositories(params)` - Search repos by language, stars, etc.
2. `fetchRepoReadme(owner, repo)` - Get README content
3. `fetchRepoIssues(owner, repo)` - Get open issues
4. `fetchRepoLanguages(owner, repo)` - Get all languages used
5. `fetchTrendingTopics()` - Get trending topics from GitHub

**Implementation notes:**

- Use `@octokit/rest` for API calls
- Handle rate limiting (5000 requests/hour authenticated)
- Implement exponential backoff for retries
- Cache trending topics (15 min TTL)

### 2.2 Transform Layer

**File:** `src/lib/pipeline/transform.ts`

**Functionality:**

1. `calculateRepoSize(stars)` - Map star count to size enum
   - SMALL: < 1,000 stars
   - MEDIUM: 1,000 - 10,000 stars
   - LARGE: 10,000 - 50,000 stars
   - HUGE: 50,000+ stars

2. `transformRepository(ghRepo, readme, languages)` - Convert GitHub API response to our schema

3. `inferDifficulty(labels)` - Analyze issue labels to determine difficulty
   - BEGINNER: `good first issue`, `beginner`, `easy`, `starter`, `good-first-issue`
   - INTERMEDIATE: `help wanted`, `medium`, `intermediate`
   - ADVANCED: `advanced`, `hard`, `complex`

4. `transformIssue(ghIssue, repoId)` - Convert GitHub issue to our schema

5. `calculateHealthScore(repo)` - Optional: Calculate repo health based on:
   - Commit recency
   - Issue response time
   - Documentation quality
   - Contributor count

### 2.3 Embeddings

**File:** `src/lib/pipeline/embeddings.ts`

**Functionality:**

1. `generateEmbedding(text)` - Call OpenAI embedding API
   - Model: `text-embedding-3-small`
   - Truncate input to 8000 chars max

2. `buildRepoEmbeddingText(repo)` - Construct text for repo embedding
   ```
   {fullName}
   {description}
   Language: {primaryLanguage}
   Topics: {topics.join(', ')}
   README:
   {readme}
   ```

3. `buildIssueEmbeddingText(issue)` - Construct text for issue embedding
   ```
   {title}
   Labels: {labels.join(', ')}
   {body}
   ```

### 2.4 Vector DB Client

**File:** `src/lib/pipeline/vectordb.ts`

**Functionality:**

1. `upsertRepoEmbedding(id, embedding, metadata)` - Add/update repo in Pinecone
2. `upsertIssueEmbedding(id, embedding, metadata)` - Add/update issue in Pinecone
3. `deleteRepoEmbedding(id)` - Remove repo from Pinecone
4. `deleteIssueEmbeddings(ids)` - Bulk remove issues from Pinecone
5. `searchRepos(params)` - Vector search with metadata filters
6. `searchIssues(params)` - Vector search with metadata filters

### 2.5 Ingestion Orchestrator

**File:** `src/lib/pipeline/ingest.ts`

**Functionality:**

1. `runIngestionPipeline()` - Full sync orchestrator
   - Iterate through configured languages
   - Process each repo and its issues
   - Track progress in SyncLog
   - Handle errors gracefully (continue on individual failures)

2. `processRepository(ghRepo)` - Single repo processing
   - Fetch README, languages, issues
   - Transform data
   - Generate embeddings
   - Upsert to Postgres and Pinecone

3. `processIssue(ghIssue, repoId, repoFullName)` - Single issue processing

**Configuration:**

```typescript
const LANGUAGES_TO_INDEX = [
  'typescript', 'javascript', 'python', 'go', 'rust',
  'java', 'csharp', 'cpp', 'ruby', 'php', 'swift', 'kotlin'
];

const MIN_STARS = 100;
const MAX_REPOS_PER_LANGUAGE = 500;
const MAX_ISSUES_PER_REPO = 100;
```

### 2.6 Ingestion Script

**File:** `src/scripts/run-ingestion.ts`

**Tasks:**

1. Create CLI script that runs the ingestion pipeline
2. Add to `package.json`:
   ```json
   {
     "scripts": {
       "ingest": "tsx src/scripts/run-ingestion.ts",
       "ingest:dry-run": "tsx src/scripts/run-ingestion.ts --dry-run"
     }
   }
   ```
3. Implement logging and progress tracking
4. Add dry-run mode for testing

---

## Phase 3: Query Layer

**Goal:** Build the discovery and search functionality.

### 3.1 Query Types

**File:** `src/lib/query/types.ts`

```typescript
export interface DiscoveryQuery {
  languages: string[];
  experienceLevel: 'beginner' | 'intermediate' | 'expert';
  interests: Interest[];
  repoSizes: RepoSize[];
  trendingTopics?: string[];
}

export type Interest =
  | 'web-development'
  | 'mobile-development'
  | 'ai-ml'
  | 'game-development'
  | 'devops'
  | 'security'
  | 'data-science'
  | 'embedded-systems';

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
```

### 3.2 Query Embeddings

**File:** `src/lib/query/embeddings.ts`

**Functionality:**

1. `buildQueryText(query)` - Convert user preferences to natural language
   - Map interests to descriptive keywords
   - Map experience level to descriptive terms
   - Combine all signals into embeddable text

2. `generateQueryEmbedding(query)` - Generate embedding from user preferences

**Interest mappings:**

```typescript
const INTEREST_DESCRIPTIONS = {
  'web-development': 'web development, frontend, backend, full-stack, React, Vue, Node.js, APIs',
  'mobile-development': 'mobile development, iOS, Android, React Native, Flutter',
  'ai-ml': 'artificial intelligence, machine learning, deep learning, NLP, computer vision',
  // ... etc
};

const EXPERIENCE_DESCRIPTIONS = {
  'beginner': 'beginner-friendly, well-documented, simple codebase, good first issues',
  'intermediate': 'moderate complexity, some experience required, established patterns',
  'expert': 'complex architecture, advanced patterns, deep domain knowledge'
};
```

### 3.3 Discovery Service

**File:** `src/lib/query/discover.ts`

**Functionality:**

1. `discoverRepositories(query)` - Main discovery function
   - Generate embedding from query
   - Search repos with filters (language, size)
   - Search issues within matched repos
   - Filter issues by difficulty based on experience level
   - Hydrate from Postgres
   - Combine and rank results

**Algorithm:**

1. Generate embedding from user preferences
2. Vector search repos with metadata filters:
   - `primaryLanguage` in query.languages
   - `size` in query.repoSizes
3. Get top 20 repo matches
4. Vector search issues within those repos:
   - Filter by difficulty appropriate to experience level
   - For beginners: `isGoodFirstIssue = true`
   - For intermediate: `difficulty in [BEGINNER, INTERMEDIATE]`
   - For expert: no difficulty filter
5. Fetch full data from Postgres
6. Group issues by repo
7. Rank repos by: semantic score + issue availability bonus
8. Return top results with top 5 issues each

### 3.4 Vector DB Query Methods

**File:** `src/lib/query/vectordb.ts`

**Functionality:**

1. `searchRepos(params)` - Search repository embeddings
   - Apply metadata filters (language, size)
   - Return top K with scores

2. `searchIssues(params)` - Search issue embeddings
   - Filter by repoIds
   - Filter by difficulty/goodFirstIssue
   - Return top K with scores

---

## Phase 4: API Routes

**Goal:** Implement the REST API endpoints.

### 4.1 Discovery Endpoint

**File:** `src/app/api/discover/route.ts`

**Method:** POST

**Request body:**
```typescript
{
  languages: string[];           // Required, min 1
  experienceLevel: string;       // Required: beginner | intermediate | expert
  interests: string[];           // Required, can be empty
  repoSizes: string[];          // Required, min 1
  trendingTopics?: string[];    // Optional
}
```

**Response:**
```typescript
{
  repos: RepoMatch[];
  query: DiscoveryQuery;
  totalReposSearched: number;
}
```

**Implementation:**
1. Validate request with Zod
2. Call `discoverRepositories(query)`
3. Return results

### 4.2 Repository Detail Endpoint

**File:** `src/app/api/repos/[id]/route.ts`

**Method:** GET

**Response:**
```typescript
{
  id: string;
  fullName: string;
  description: string | null;
  url: string;
  stars: number;
  forks: number;
  primaryLanguage: string | null;
  languages: string[];
  topics: string[];
  license: string | null;
  readme: string | null;
  healthScore: number | null;
  size: RepoSize;
  issues: Issue[];              // Open issues, ordered by relevance
  createdAt: string;
  updatedAt: string;
  pushedAt: string;
}
```

**Implementation:**
1. Fetch repo from Postgres by ID
2. Include related issues
3. Return 404 if not found

### 4.3 Trending Topics Endpoint

**File:** `src/app/api/trending/route.ts`

**Method:** GET

**Response:**
```typescript
string[]  // Array of trending topic names
```

**Implementation:**
1. Fetch from GitHub trending or use cached topics
2. Return array of topic strings
3. Cache for 15 minutes

---

## Phase 5: Frontend - Discovery Flow

**Goal:** Build the multi-step discovery form and results page.

### 5.1 Constants & Configuration

**File:** `src/lib/discovery/constants.ts`

Define all options for:
- Languages (value, label)
- Experience levels (value, label, description)
- Interests (value, label)
- Repository sizes (value, label, description)

### 5.2 API Hooks

**File:** `src/lib/api/hooks.ts`

**Hooks:**

1. `useDiscovery()` - Mutation for discovery query
2. `useRepo(id)` - Query for single repo details
3. `useTrendingTopics()` - Query for trending topics (15 min stale time)

### 5.3 Discovery Form Component

**File:** `src/components/discovery/discovery-form.tsx`

**Requirements:**

1. Multi-step form with 5 steps:
   - Step 1: Language selection (multi-select chips)
   - Step 2: Experience level (single-select cards)
   - Step 3: Interests (multi-select chips, optional)
   - Step 4: Repository size (multi-select cards)
   - Step 5: Trending topics (multi-select chips, optional)

2. Navigation:
   - Back/Continue buttons
   - Step indicator dots
   - Validation per step

3. On submit:
   - Encode query to base64
   - Navigate to `/discover?q={encoded}`

**Sub-components:**
- `StepContainer` - Title, description, children wrapper
- `ToggleChip` - Multi-select pill button
- `SelectionCard` - Single/multi-select card with description
- `StepIndicator` - Progress dots

### 5.4 Landing Page

**File:** `src/app/page.tsx`

**Layout:**
- Hero section with title and description
- Discovery form component
- Optional: Featured repos or stats

### 5.5 Results Page

**File:** `src/app/discover/page.tsx`

**Requirements:**

1. Parse query from URL param
2. Execute discovery mutation on mount
3. States:
   - Loading: Skeleton cards
   - Error: Error message with retry
   - Empty: No results message
   - Success: List of repo cards

### 5.6 Repository Card Component

**File:** `src/components/discovery/repo-card.tsx`

**Display:**
- Repo name (link to detail page)
- Description
- Star count
- Primary language badge
- Topic badges (max 4)
- Matched issues section:
  - Issue number and title
  - Difficulty badge
  - Link to GitHub issue

---

## Phase 6: Frontend - Repository Detail

**Goal:** Build the repository detail page.

### 6.1 Repository Detail Page

**File:** `src/app/repo/[owner]/[name]/page.tsx`

**Requirements:**

1. Server component for initial data fetch
2. Display:
   - Header: Name, description, stats (stars, forks, issues)
   - Metadata: Languages, license, last updated
   - Topics as badges
   - README content (rendered markdown)
   - Issues list with filters

### 6.2 Issue List Component

**File:** `src/components/repo/issue-list.tsx`

**Requirements:**

1. List of issues with:
   - Title (link to GitHub)
   - Labels as badges
   - Difficulty indicator
   - Comment count
   - Age

2. Filters:
   - Difficulty (All, Beginner, Intermediate, Advanced)
   - Good first issue only toggle

3. Sort options:
   - Newest first
   - Most relevant (score)
   - Least comments

### 6.3 README Renderer

**File:** `src/components/repo/readme-renderer.tsx`

**Options:**
- Use `react-markdown` with GFM support
- Or server-side render with `marked`
- Style with Tailwind typography plugin

---

## Phase 7: Layout & Polish

**Goal:** Add global layout, navigation, and UX polish.

### 7.1 Root Layout

**File:** `src/app/layout.tsx`

**Requirements:**
- HTML metadata
- TanStack Query provider
- Global styles
- Header component
- Footer component

### 7.2 Header Component

**File:** `src/components/layout/header.tsx`

**Elements:**
- Logo/brand
- Navigation links (Home, optional: About, GitHub)
- GitHub link to project repo

### 7.3 Footer Component

**File:** `src/components/layout/footer.tsx`

**Elements:**
- Copyright
- Links (GitHub, Twitter, etc.)
- Built with credits

### 7.4 Loading States

**Requirements:**
- Skeleton components for cards
- Loading spinner component
- Page-level loading states

### 7.5 Error Handling

**Requirements:**
- Error boundary component
- User-friendly error messages
- Retry functionality

### 7.6 Responsive Design

**Requirements:**
- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px)
- Touch-friendly interactions

---

## Phase 8: Deployment & Operations

**Goal:** Set up deployment, monitoring, and scheduled jobs.

### 8.1 Vercel Deployment

**Tasks:**

1. Connect GitHub repo to Vercel
2. Configure environment variables
3. Set up preview deployments for PRs
4. Configure production domain

### 8.2 Database Hosting

**Options:**
- Vercel Postgres
- Supabase
- Neon
- Railway

**Tasks:**
1. Create production database
2. Run migrations
3. Configure connection pooling

### 8.3 Scheduled Ingestion

**Options:**

**Option A: Vercel Cron Jobs**
- Create API route for ingestion trigger
- Configure `vercel.json` cron schedule
- Limit: 10 second timeout on hobby plan

**Option B: External Worker**
- Deploy separate worker (Railway, Render, etc.)
- Run ingestion script on schedule
- Better for long-running jobs

**Option C: GitHub Actions**
```yaml
name: Sync Repositories
on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run ingest
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          # ... other secrets
```

**Recommended schedule:**
- Full sync: Weekly (Sunday night)
- Incremental sync (issues only): Every 6 hours

### 8.4 Monitoring

**Recommendations:**

1. **Error tracking:** Sentry
2. **Analytics:** Vercel Analytics or Plausible
3. **Uptime monitoring:** Better Uptime or similar
4. **Database monitoring:** Built-in from provider

### 8.5 Cleanup Job

**File:** `src/scripts/cleanup-stale.ts`

**Functionality:**
1. Remove repos not updated in 30+ days
2. Remove closed issues
3. Clean up orphaned embeddings from Pinecone
4. Log cleanup stats

---

## Implementation Order & Dependencies

### Sprint 1: Foundation (Week 1)
1. Project setup (1.1)
2. Database schema (1.2)
3. Vector DB setup (1.3)
4. GitHub client (2.1)

### Sprint 2: Ingestion (Week 2)
1. Transform layer (2.2)
2. Embeddings service (2.3)
3. Vector DB client (2.4)
4. Ingestion orchestrator (2.5)
5. Ingestion script (2.6)
6. Run initial data sync

### Sprint 3: Query Layer (Week 3)
1. Query types (3.1)
2. Query embeddings (3.2)
3. Discovery service (3.3)
4. Vector DB query methods (3.4)
5. API routes (4.1-4.3)

### Sprint 4: Frontend Core (Week 4)
1. Constants & hooks (5.1-5.2)
2. Discovery form (5.3)
3. Landing page (5.4)
4. Results page (5.5)
5. Repo card (5.6)

### Sprint 5: Frontend Detail & Polish (Week 5)
1. Repo detail page (6.1-6.3)
2. Layout components (7.1-7.3)
3. Loading & error states (7.4-7.5)
4. Responsive design (7.6)

### Sprint 6: Deployment (Week 6)
1. Vercel deployment (8.1)
2. Database hosting (8.2)
3. Scheduled ingestion (8.3)
4. Monitoring (8.4)
5. Cleanup job (8.5)

---

## Testing Strategy

### Unit Tests

**Tools:** Vitest

**Coverage:**
- Transform functions
- Difficulty inference
- Query building
- Utility functions

### Integration Tests

**Tools:** Vitest + Prisma test utils

**Coverage:**
- Database operations
- API routes
- Discovery flow

### E2E Tests

**Tools:** Playwright

**Coverage:**
- Discovery form flow
- Results page rendering
- Repo detail page
- Navigation

---

## Future Enhancements (Post-MVP)

1. **User Accounts**
   - Save preferences
   - Bookmark repos/issues
   - Track contributions

2. **Enhanced Matching**
   - LLM re-ranking with explanations
   - "Why this repo?" feature
   - Personalization based on GitHub profile

3. **Notifications**
   - Email digest of new matching issues
   - Webhook integrations

4. **Analytics Dashboard**
   - Popular repos
   - Trending issues
   - Community stats

5. **Browser Extension**
   - Show "similar repos" on GitHub pages
   - Quick bookmark to Git-Involved

6. **API Access**
   - Public API for third-party integrations
   - Rate limiting and API keys

---

## Environment Variables Reference

```env
# Database
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"

# GitHub
GITHUB_TOKEN="ghp_xxxxxxxxxxxx"

# OpenAI
OPENAI_API_KEY="sk-xxxxxxxxxxxx"

# Pinecone
PINECONE_API_KEY="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
PINECONE_REPO_INDEX="git-involved-repos"
PINECONE_ISSUE_INDEX="git-involved-issues"

# Optional
NEXT_PUBLIC_APP_URL="https://git-involved.dev"
SENTRY_DSN="https://xxxxx@sentry.io/xxxxx"
```

---

## Agent Instructions

When implementing this plan:

1. **Follow the sprint order** - Each phase builds on the previous
2. **Validate at each step** - Don't move forward with broken functionality
3. **Use TypeScript strictly** - No `any` types, proper error handling
4. **Test as you go** - Write tests for critical paths
5. **Commit frequently** - Small, focused commits with clear messages
6. **Document decisions** - Add comments for non-obvious code

For each file mentioned, reference the code snippets discussed in the planning conversation for implementation details.
