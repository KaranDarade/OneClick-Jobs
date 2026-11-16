# HLD-06: Module Dependency Architecture

## 1. Purpose & Scope
This document outlines the source-code module dependencies across **OneClick Jobs**, ensuring clean architectural layering, strict separation of concerns, and unidirectional dependency enforcement.

---

## 2. Mermaid Diagram: Codebase Module Dependency Hierarchy

```mermaid
flowchart TD
    subgraph Layer1["1. Presentation Layer (Client UI Components)"]
        direction TB
        PAGE["src/app/page.tsx"]
        LAYOUT["src/app/layout.tsx"]
        COMPONENTS["src/components/<br/>• JobCard.tsx<br/>• JobDetailModal.tsx<br/>• SearchControls.tsx<br/>• FilterPanel.tsx<br/>• ResumeUpload.tsx<br/>• AiMatchAssistant.tsx"]
        
        PAGE --> LAYOUT
        PAGE --> COMPONENTS
    end

    subgraph Layer2["2. Feature & Client State Layer"]
        direction TB
        FEATURES["src/features/jobs/<br/>• useCandidateProfile.ts<br/>• useSavedJobs.ts"]
    end

    COMPONENTS --> FEATURES
    PAGE --> FEATURES

    subgraph Layer3["3. API Gateway / Route Handlers"]
        direction TB
        API_ROUTES["src/app/api/<br/>• /jobs/route.ts<br/>• /jobs/[id]/route.ts<br/>• /jobs/[id]/ai-analysis/route.ts<br/>• /resume/parse/route.ts<br/>• /sync/route.ts<br/>• /health/route.ts"]
    end

    COMPONENTS -.->|Network HTTP Calls| API_ROUTES

    subgraph Layer4["4. Domain Business Logic Layer"]
        direction TB
        JOBS_SEARCH["src/server/jobs/search.ts"]
        JOBS_NORM["src/server/jobs/normalization.ts"]
        JOBS_DEDUP["src/server/jobs/deduplication.ts"]
        RESUME_SKILLS["src/server/resume/skills.ts"]
        MATCHING_SCORE["src/server/matching/scoring.ts"]
        AI_PROVIDER["src/server/ai/provider.ts"]
    end

    API_ROUTES --> JOBS_SEARCH
    API_ROUTES --> RESUME_SKILLS
    API_ROUTES --> AI_PROVIDER
    FEATURES -.->|Shared Logic| MATCHING_SCORE

    subgraph Layer5["5. Aggregation & Provider Layer"]
        direction TB
        SYNC_ENGINE["src/server/db/sync.ts"]
        PROVIDERS["src/server/providers/<br/>• base.ts<br/>• greenhouse.ts<br/>• lever.ts<br/>• ashby.ts<br/>• remoteok.ts<br/>• jobvetta.ts<br/>• adzuna.ts<br/>• jooble.ts<br/>• apify.ts<br/>• external-search.ts"]
    end

    API_ROUTES --> SYNC_ENGINE
    SYNC_ENGINE --> PROVIDERS
    SYNC_ENGINE --> JOBS_NORM
    SYNC_ENGINE --> JOBS_DEDUP

    subgraph Layer6["6. Persistence & Caching Abstraction Layer"]
        direction TB
        REPO["src/server/db/repository.ts<br/>• IJobRepository<br/>• InMemoryJobRepository<br/>• SupabaseJobRepository"]
        CACHE["src/server/db/cache.ts<br/>• MemoryCache<T>"]
        CLIENT["src/server/db/client.ts<br/>• Supabase Client Factory"]
    end

    JOBS_SEARCH --> REPO
    JOBS_SEARCH --> CACHE
    SYNC_ENGINE --> REPO
    REPO --> CLIENT

    subgraph Layer7["7. Shared Type System (Domain Core)"]
        direction TB
        TYPES["src/types/<br/>• job.ts (Job, NormalizedJob, JobSource)<br/>• resume.ts (CandidateProfile, ExtractedSkill)<br/>• filters.ts (JobFilters, FilterOptions)"]
    end

    Layer1 --> TYPES
    Layer2 --> TYPES
    Layer3 --> TYPES
    Layer4 --> TYPES
    Layer5 --> TYPES
    Layer6 --> TYPES
```

---

## 3. Dependency Boundary Rules

1. **Unidirectional Downward Dependencies**:
   - Higher layers may import from lower layers; lower layers **never** import from higher layers.
   - For example, `src/server/db/repository.ts` has zero knowledge of `src/app/api/` or `src/components/`.

2. **Server / Client Isolation**:
   - Files designated with `"use client"` in `src/components/` and `src/features/` do not import Node.js server libraries (`fs`, `crypto`, `@supabase/supabase-js` service role keys, or `unpdf`).
   - Server-only route handlers and engines under `src/server/` do not import React client hooks or browser globals (`window`, `localStorage`, `sessionStorage`).

3. **Domain Reusability**:
   - `src/server/matching/scoring.ts` is pure TypeScript without Node.js-specific or DOM-specific dependencies. This allows it to execute on both the server (for batch evaluations) and on the client (for instantaneous slider recalculation in React).

4. **Shared Type System**:
   - `src/types/` serves as the single source of truth for all data contracts (`Job`, `CandidateProfile`, `JobFilters`). All layers depend on these interface definitions without circular imports.
