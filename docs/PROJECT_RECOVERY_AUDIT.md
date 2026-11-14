# OneClick Jobs — Project Technical Audit & Recovery Report
**Document Version:** 1.0.0  
**Generated Date:** November 14, 2026  
**Auditor:** Senior Full-Stack Engineer, Software Architect & QA Lead  
**Repository:** [https://github.com/KaranDarade/OneClick-Jobs](https://github.com/KaranDarade/OneClick-Jobs)  
**Production URL:** [https://oneclickjobs-beta.vercel.app](https://oneclickjobs-beta.vercel.app)

---

## 1. Project Overview & Business Purpose

**OneClick Jobs** is a production-grade, privacy-first job discovery and candidate-matching platform custom-tailored for the Indian tech ecosystem (Bengaluru, NCR, Pune, Mumbai, Hyderabad, Chennai, Kolkata). 

The platform addresses three critical friction points in tech job hunting:
1. **Scattered & Noisy Feeds**: Candidates waste dozens of hours jumping between fragmented company career boards, portals with expired roles, and noisy third-party scrapers.
2. **Spam & Ghost Listings**: Aggregators often index stale or non-existent roles. OneClick Jobs pulls direct from company Applicant Tracking Systems (ATS) like Greenhouse, Lever, and Ashby with strict deduplication and expiration audits.
3. **Privacy Concerns**: Typical career portals retain and monetize uploaded resumes. OneClick Jobs implements a strict **zero-retention architecture** where PDF resumes are parsed ephemerally in server memory; profile state resides exclusively in the candidate's browser `localStorage`.

---

## 2. Technology Stack & Key Dependencies

| Layer | Technology | Version | Purpose in this Project |
| :--- | :--- | :--- | :--- |
| **Framework** | Next.js (App Router, Turbopack) | `16.4.3` | Server-Side Rendering (SSR), Partial Prerendering (PPR), Edge caching, API routing. |
| **Language** | TypeScript | `^5` | Strict end-to-end typing across schemas, job entities, and provider contracts. |
| **Runtime** | Node.js | `>=20.x` (Tested on `v24.0.1`) | Native asynchronous server runtime. |
| **Styling** | Tailwind CSS & Lucide Icons | `v4` / `v1.56` | Modern responsive UI, accessible components, and icon system. |
| **Job Aggregation** | Multi-Provider Engine | Custom | Concurrently queries Greenhouse, Lever, Ashby, Adzuna, Jooble, Apify, and Jobvetta. |
| **Resume Engine** | `pdf-parse` + Custom Regex Lexer | `1.1.1` | In-memory text extraction, skill normalization, and experience calculation. |
| **AI Assistant** | Google Gemini API (`@google/genai`) | `0.1.2` | Generates personalized fit analysis, interview tips, and cover letter drafts with deterministic fallback. |
| **Database (Dual-Mode)** | Supabase (`@supabase/supabase-js`) | `^2.49` | Optional PostgreSQL persistence with seamless in-memory fallback (`InMemoryJobRepository`). |
| **Testing Harness** | Vitest | `5.0.4` | Blazing-fast unit and integration test runner (14 suites, 95 passing tests). |
| **Deployment** | Vercel Serverless Edge | CI/CD | Automated multi-region deployment with security headers and caching. |

---

## 3. High-Level Architecture

```
                                  [ Browser / Client ]
                                            │
               ┌────────────────────────────┼────────────────────────────┐
               ▼                            ▼                            ▼
      Job Discovery (/jobs)       Resume Match (/upload)       Job Details (/jobs/[id])
      - Keyword & City search     - Ephemeral PDF parse        - Full ATS description
      - Client match rescoring    - localStorage profile       - AI Career Assistant
               │                            │                            │
               └────────────────────────────┼────────────────────────────┘
                                            │ (HTTP / JSON)
                                            ▼
                                [ Next.js Route Handlers ]
                                            │
               ┌────────────────────────────┼────────────────────────────┐
               ▼                            ▼                            ▼
         /api/jobs                  /api/resume/parse            /api/jobs/[id]/ai-analysis
               │                            │                            │
     ┌─────────┴─────────┐                  │                            ▼
     ▼                   ▼                  ▼                    ┌────────────────┐
InMemory Cache      Dual-Mode DB       pdf-parse Lexer           │ Google Gemini  │
  (5-min TTL)       (Supabase / Mem)   (Zero disk persistence)   │ 2.0 Flash      │
     │                                                           └───────┬────────┘
     ▼                                                                   │ (fallback)
Multi-Provider Aggregator                                                ▼
 ├─ Greenhouse (15 tech companies)                              Deterministic Rules Engine
 ├─ Lever (Paytm, Meesho, CRED)
 ├─ Ashby (Supabase, Linear, Sentry, Resend)
 ├─ Adzuna (India REST API)
 ├─ Jooble (Partner API)
 ├─ Apify (Actor / Dataset)
 └─ Jobvetta (Aggregator feed)
```

---

## 4. Directory & Codebase Structure

```
oneclick-jobs/
├── docs/                             # Engineering specs and audit records
│   ├── DECISIONS.md                  # Architecture decision records
│   ├── ROADMAP.md                    # Completed and future milestones
│   ├── SEARCH_ENGINE.md              # In-depth search & match algorithm specs
│   ├── TESTING_PLAN.md               # Master 8-phase test matrix
│   └── PROJECT_RECOVERY_AUDIT.md     # THIS COMPLETE AUDIT REPORT
├── public/                           # Static public web assets
│   ├── icon.svg                      # Custom vector squircle logo
│   ├── favicon.ico                   # Multi-resolution binary icon (16, 32, 48)
│   ├── apple-icon.png                # 180x180 iOS bookmark icon
│   ├── icon-192.png / icon-512.png   # PWA application icons
├── scripts/                          # Build & utility automation scripts
│   └── generate-icons.js             # Sharp-based icon generation pipeline
├── src/
│   ├── app/                          # Next.js App Router (Pages & API endpoints)
│   │   ├── api/
│   │   │   ├── health/route.ts       # Service uptime and memory telemetry
│   │   │   ├── jobs/route.ts         # Multi-provider aggregated search
│   │   │   ├── jobs/[id]/route.ts    # Single job details resolver
│   │   │   ├── jobs/[id]/ai-analysis # Gemini candidate fit & cover letter
│   │   │   ├── resume/parse/route.ts # Ephemeral PDF resume parser
│   │   │   └── sync/route.ts         # Background DB synchronization
│   │   ├── jobs/                     # Job listings and search interface
│   │   ├── jobs/[id]/                # Dynamic job detail page
│   │   ├── saved/                    # User bookmarked jobs
│   │   ├── upload-resume/            # Resume dropzone and skill tuner
│   │   ├── layout.tsx                # Root layout with metadata and providers
│   │   └── page.tsx                  # Landing homepage with quick filters
│   ├── components/                   # Reusable UI presentation components
│   │   ├── filters/                  # Location, experience, and arrangement filters
│   │   ├── jobs/                     # Job cards, list view, AI assistant widget
│   │   ├── layout/                   # Navbar and Footer with brand marks
│   │   ├── ui/                       # Buttons, badges, input primitives
│   │   └── upload/                   # Resume upload dropzone
│   ├── features/                     # Client-side domain state hooks
│   │   ├── job-search/               # Client search filters and fixtures
│   │   ├── matching/                 # CandidateProfileProvider context
│   │   └── saved-jobs/               # useSavedJobs localStorage hook
│   ├── lib/                          # Shared helper functions (cn, formatters)
│   ├── server/                       # Core server-side business logic
│   │   ├── ai/provider.ts            # Gemini client & deterministic rule fallback
│   │   ├── db/                       # Supabase client, repository, and sync runner
│   │   ├── jobs/                     # Deduplication, location, and skill lexers
│   │   ├── matching/scoring.ts       # 100-point compatibility scoring formula
│   │   ├── providers/                # Client adapters for 7 external job APIs
│   │   ├── resume/                   # pdf-parse text extractor & skill mapper
│   │   └── cache.ts                  # In-memory TTL cache
│   └── types/                        # TypeScript type definitions (Job, AI, Profile)
├── supabase/
│   └── migrations/20261027_init.sql  # PostgreSQL schema for jobs and sync logs
└── tests/
    └── unit/                         # 14 Vitest test suites (95 tests)
```

---

## 5. Core Feature Implementation Audit

### 5.1 Job Aggregation & Provider Layer
- **Greenhouse (`src/server/providers/greenhouse/client.ts`)**: Connects to public JSON boards for 15 top employers (Stripe, Figma, Datadog, Coinbase, Airbnb, Groww, etc.). Filters specifically for India locations (`Bangalore`, `Mumbai`, `Remote, India`).
- **Lever (`src/server/providers/lever/client.ts`)**: Connects to public postings for Paytm, Meesho, and CRED. Normalizes workplace type (`onsite`, `remote`, `hybrid`).
- **Ashby (`src/server/providers/ashby/client.ts`)**: Connects to developer-favorite startups (Supabase, Linear, Sentry, Resend) without requiring authentication.
- **Commercial Aggregators (`adzuna`, `jooble`, `apify`, `jobvetta`)**: Configured with fail-safe error isolation. If API keys are missing in `.env.local`, they automatically downgrade to demo fallback mode without crashing or hanging the user request.
- **Concurrency & Failure Isolation**: All providers are queried concurrently using `Promise.allSettled`. If one provider encounters a network timeout, remaining feeds continue uninterrupted.

### 5.2 Search, Filtering & Deduplication
- **Exact Keyword Tokenization**: Differentiates between substring overlaps (e.g., searching for `Java` will not erroneously match `JavaScript`).
- **Location Normalization (`locations.ts`)**: Normalizes variants like `Bangalore`, `BLR`, `Bengaluru`, `Bengaluru, Karnataka` into canonical `Bengaluru`.
- **Deduplication Engine (`deduplicate.ts`)**: Uses composite keys `(normalizedTitle + company + normalizedCity)` to collapse identical job postings republished across multiple boards.

### 5.3 Resume Parsing & Privacy
- **In-Memory Stream Processing (`parser.ts`)**: PDF files are read directly from `multipart/form-data` into memory buffers. 
- **Zero Disk Retention**: The server never writes uploaded PDF resumes to disk, object storage, or databases. Once skills are extracted, the buffer is discarded by garbage collection.
- **Skill Extraction Lexer (`skills.ts`)**: Uses regex word-boundary matching across 120+ technical keywords (Frontend, Backend, Cloud, AI/ML, DevOps, Databases).

### 5.4 100-Point Match Scoring Formula
Implemented in `src/server/matching/scoring.ts`:
$$\text{Score} = S_{\text{skills}} (40) + S_{\text{exp}} (25) + S_{\text{role}} (20) + S_{\text{loc}} (10) + S_{\text{fresh}} (5)$$

1. **Required & Preferred Skills (40 pts)**: Jaccard similarity between candidate skills and job requirements.
2. **Experience Alignment (25 pts)**: Full points if candidate meets or exceeds required years; proportional penalty for experience deficits.
3. **Role & Title Match (20 pts)**: Token overlap between candidate's target title and job posting.
4. **Location & Remote Preference (10 pts)**: Matches candidate preferred cities or gives full credit for Remote positions.
5. **Listing Freshness (5 pts)**: Tiered points based on posting recency ($<7\text{ days} = 5\text{ pts}$, $<30\text{ days} = 3\text{ pts}$).

### 5.5 AI Career Assistant
- **Gemini Integration (`provider.ts`)**: Uses `@google/genai` with model `gemini-2.0-flash`.
- **Deterministic Fallback**: If `GEMINI_API_KEY` is not present, the system instantly evaluates the candidate's skill overlap against the job description using rule heuristics, returning structured JSON with fit summaries, strengths, growth areas, interview tips, and a customized cover letter starter.

### 5.6 Persistence Layer
- **Dual-Mode Repository (`repository.ts`)**: Automatically checks for `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. If present, operates against PostgreSQL; if absent, transparently operates using `InMemoryJobRepository`.
- **Saved Jobs**: Maintained in browser `localStorage` with real-time reactive counts in the top navigation bar.

---

## 6. Git & Deployment Reconciliation Matrix

| Environment / Branch | Latest Commit SHA | Description | Status |
| :--- | :--- | :--- | :--- |
| **Local Workspace** | `4127889` | Brand assets, browser tab favicon, Apple touch icons | **Clean, Latest** |
| **GitHub `main`** | `4127889` | Synchronized with local workspace | **Up to Date** |
| **GitHub `feature/oneclick-jobs-development`** | `f454666` | 4 commits behind `main` | **Needs Fast-Forward** |
| **Deployed Production (`vercel.app`)** | `4127889` | Verified via HTTP headers, `/api/health`, and HTML metadata | **100% Synced & Live** |

---

## 7. Verification & Automated Test Results

### 7.1 Vitest Unit & Integration Suites
Ran `npm test` across all 14 test suites:
```
 ✓ tests/unit/locations.test.ts (10 tests)
 ✓ tests/unit/repository.test.ts (3 tests)
 ✓ tests/unit/deduplicate.test.ts (7 tests)
 ✓ tests/unit/resume-skills.test.ts (7 tests)
 ✓ tests/unit/matching-scoring.test.ts (7 tests)
 ✓ tests/unit/search.test.ts (14 tests)
 ✓ tests/unit/normalize.test.ts (8 tests)
 ✓ tests/unit/greenhouse.test.ts (5 tests)
 ✓ tests/unit/jobvetta.test.ts (7 tests)
 ✓ tests/unit/resume-parser.test.ts (5 tests)
 ✓ tests/unit/multi-provider.test.ts (10 tests)
 ✓ tests/unit/skills.test.ts (6 tests)
 ✓ tests/unit/ai-provider.test.ts (3 tests)
 ✓ tests/unit/production-readiness.test.ts (3 tests)

Test Files:  14 passed (14)
Tests:       95 passed (95)
Duration:    1.88s
```

### 7.2 TypeScript Static Typecheck
Ran `npx tsc --noEmit`: **0 errors detected**.

### 7.3 Live API Endpoints Tested Locally (Port 3000)
1. `GET /api/health`: Returned `200 OK`, response time `3ms`.
2. `GET /api/jobs?limit=5`: Returned `543` live tech jobs aggregated across Greenhouse and Lever.
3. `GET /api/jobs/[id]`: Successfully fetched full description and requirements for Coinbase Program Lead (`greenhouse:coinbase-8357227`).
4. `POST /api/jobs/[id]/ai-analysis`: Successfully returned deterministic fit summary, interview questions, and cover letter starter.

---

## 8. Prioritized Next Steps & Recommendations

1. **Fast-Forward Development Branch**: Bring `feature/oneclick-jobs-development` up to date with `main`:
   ```bash
   git checkout feature/oneclick-jobs-development
   git merge main --ff-only
   git push origin feature/oneclick-jobs-development
   git checkout main
   ```
2. **Optional Database Connect**: For long-term historical analytics, connect Supabase PostgreSQL by running `supabase/migrations/20261027_init.sql` and populating `SUPABASE_URL` in Vercel.
3. **Optional Gemini API Key**: Add a free Gemini key in Vercel to unlock dynamic LLM-generated career analysis.
