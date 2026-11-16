# HLD-02: Container Architecture (C4 Level 2)

## 1. Purpose & Scope
The Container Architecture diagram zooms in from the system context to illustrate the high-level software containers comprising the **OneClick Jobs** runtime environment. It highlights the separation between client-side execution (browser state and UI tree), server-side serverless operations (Next.js App Router and API routes), domain services, caching, repository layers, and external upstream APIs.

---

## 2. Mermaid Diagram: Container Architecture (C4 Level 2)

```mermaid
flowchart TB
    subgraph ClientContainer["Client Container: User Web Browser"]
        direction TB
        UI["React 19 Presentation Tree<br/>[Next.js App Router Client Components]<br/>• JobFeed & SearchControls<br/>• FilterPanel & JobDetailModal<br/>• ResumeUpload & AiMatchAssistant"]
        
        subgraph ClientStorage["Client State & Web Storage"]
            SESSION["sessionStorage: 'oneclick_candidate_profile_v1'<br/>• CandidateProfile (skills, experience, projects)<br/>• Session-scoped, zero cloud storage"]
            LOCAL["localStorage: 'oneclick_saved_jobs_v1'<br/>• SavedJob[] (persisted bookmarks)<br/>• Browser-persistent"]
        end

        CLIENT_MATCH["Client-Side Scoring Loop<br/>[src/server/matching/scoring.ts]<br/>• Dynamic compatibility recalculation<br/>• Zero server round-trips for slider adjustments"]

        UI <--> SESSION
        UI <--> LOCAL
        UI --> CLIENT_MATCH
    end

    subgraph ServerContainer["Server Container: Next.js 16.4.3 Runtime (Vercel Serverless / Node.js)"]
        direction TB
        
        subgraph RouteHandlers["API Gateway & Route Handlers (src/app/api/)"]
            API_JOBS["/api/jobs & /api/jobs/[id]<br/>[Search, Filter & Job Details]"]
            API_SYNC["/api/sync<br/>[Provider Aggregation & Sync Execution]"]
            API_RESUME["/api/resume/parse<br/>[Multipart/PDF In-Memory Parser]"]
            API_AI["/api/jobs/[id]/ai-analysis<br/>[Career Alignment & Cover Letter Generator]"]
            API_HEALTH["/api/health<br/>[Readiness & DB Status Probe]"]
        end

        subgraph DomainServices["Core Domain Engines & Services"]
            SEARCH_ENGINE["Search & Ranking Engine<br/>[src/server/jobs/search.ts]<br/>• Exact, partial, & alias matching<br/>• Multi-attribute facet filtering<br/>• Software-only gate enforcement"]
            
            NORM_ENGINE["Normalization Engine<br/>[src/server/jobs/normalization.ts]<br/>• Discipline mapping (9 categories)<br/>• Seniority mapping (6 levels)<br/>• Work arrangement (remote/hybrid/onsite)<br/>• Indian tech hub location canonicalization"]
            
            DEDUP_ENGINE["Deduplication Engine<br/>[src/server/jobs/deduplication.ts]<br/>• Company-title-location fingerprinting<br/>• Direct ATS priority over aggregators"]
            
            SYNC_SERVICE["JobSyncService<br/>[src/server/db/sync.ts]<br/>• Provider coordination & error containment<br/>• Sync metrics tracking"]
            
            RESUME_PARSER["Resume Processing Service<br/>[src/server/resume/skills.ts]<br/>• unpdf stream extraction<br/>• 200+ taxonomy dictionary matching<br/>• Fresher / experience inference"]
            
            AI_GATEWAY["AI Provider Gateway<br/>[src/server/ai/provider.ts]<br/>• GeminiAIProvider (gemini-2.0-flash)<br/>• DeterministicFallbackProvider (rules)"]
        end

        subgraph PersistenceAbstraction["Data Persistence & Caching Subsystem"]
            REPO_INTERFACE["IJobRepository<br/>[src/server/db/repository.ts]"]
            IN_MEMORY_REPO["InMemoryJobRepository<br/>[Local Static + Runtime Ingestion Cache]"]
            SUPABASE_REPO["SupabaseJobRepository<br/>[PostgreSQL with pgvector/GIN indexes]"]
            CACHE["MemoryCache<T><br/>[src/server/db/cache.ts]<br/>• In-memory TTL key-value cache"]
        end
    end

    subgraph ExternalBackends["External Upstream Services"]
        direction TB
        EXT_ATS["Live ATS Endpoints<br/>• Greenhouse Public API<br/>• Lever Public API<br/>• Ashby HQ API<br/>• RemoteOK Feed"]
        EXT_GEMINI["Google Gemini API<br/>• generativelanguage.googleapis.com"]
        EXT_SUPABASE["Supabase Cloud Platform<br/>• Managed PostgreSQL Database"]
    end

    %% Client to Server Route connections
    UI -->|HTTP GET /api/jobs?query=...| API_JOBS
    UI -->|HTTP POST /api/resume/parse (multipart)| API_RESUME
    UI -->|HTTP POST /api/jobs/[id]/ai-analysis| API_AI

    %% Server Internal Routing
    API_JOBS --> SEARCH_ENGINE
    API_SYNC --> SYNC_SERVICE
    API_RESUME --> RESUME_PARSER
    API_AI --> AI_GATEWAY

    %% Domain Engine Connections
    SEARCH_ENGINE --> REPO_INTERFACE
    SYNC_SERVICE --> NORM_ENGINE
    SYNC_SERVICE --> DEDUP_ENGINE
    SYNC_SERVICE --> REPO_INTERFACE
    SYNC_SERVICE --> EXT_ATS

    %% Cache & Persistence
    REPO_INTERFACE -.->|Configured| SUPABASE_REPO
    REPO_INTERFACE -.->|Fallback / Default| IN_MEMORY_REPO
    SEARCH_ENGINE <--> CACHE
    SUPABASE_REPO --> EXT_SUPABASE
    AI_GATEWAY --> EXT_GEMINI
```

---

## 3. Container Responsibilities Breakdown

### 3.1 Client Container (Browser Runtime)
- **Presentation Layer**: Built with React 19 Client Components (`JobFeed`, `FilterPanel`, `SearchControls`, `JobDetailModal`, `AiMatchAssistant`).
- **Profile Privacy Management (`sessionStorage`)**: Stores candidate skills, years of experience, projects, and target role in `oneclick_candidate_profile_v1`. Does not upload raw resumes or PII to the database.
- **Bookmarks (`localStorage`)**: Persists saved job records (`oneclick_saved_jobs_v1`) client-side across browser sessions.
- **Client-Side Scoring Loop**: Recomputes match compatibility instantly when the user tunes weights or switches active filters, without incurring server latency.

### 3.2 Server Container (Next.js 16 App Router)
- **API Gateway**: Provides 6 isolated Route Handlers under `/api/*` for health checks, job search, job details, sync orchestration, resume parsing, and AI analysis.
- **Domain Engines**:
  - `JobSyncService`: Coordinates background or on-demand ingestion across enabled ATS providers.
  - `normalization.ts`: Normalizes tech discipline, seniority, work mode, and Indian metro locations.
  - `deduplication.ts`: Computes canonical job fingerprints (`slugify(company):slugify(title):slugify(location)`) and prioritizes direct ATS listings.
  - `skills.ts`: Extracts text from PDF buffers using `unpdf`, evaluates 200+ technology keywords, and infers seniority.
  - `provider.ts`: Manages LLM generation via Gemini 2.0 Flash with automatic graceful fallback to deterministic rules.
- **Repository Subsystem**:
  - Encapsulated by `IJobRepository` interface.
  - `SupabaseJobRepository`: Interfaces with cloud PostgreSQL via `@supabase/supabase-js`.
  - `InMemoryJobRepository`: Thread-safe in-process store with built-in initial job fixtures.
  - `MemoryCache<T>`: Key-value TTL cache preventing redundant remote calls.

### 3.3 External Upstream Services
- **Keyless ATS Endpoints**: Greenhouse (`boards-api.greenhouse.io`), Lever (`api.lever.co/v0`), Ashby (`api.ashbyhq.com`), and RemoteOK (`remoteok.com/api`).
- **Google Gemini API**: Invoked for qualitative match breakdowns and cover letter starters.
- **Supabase Cloud**: Managed PostgreSQL database providing relational storage, foreign keys, and GIN indexes.

---

## 4. Architectural Verification Evidence
- Next.js App Router entrypoint: [src/app/page.tsx](file:///c:/Users/KARAN/Desktop/Web%20Development/Anti%20Gravity/Jobs%20Curator/oneclick-jobs/src/app/page.tsx)
- Server Route Handlers: [src/app/api/](file:///c:/Users/KARAN/Desktop/Web%20Development/Anti%20Gravity/Jobs%20Curator/oneclick-jobs/src/app/api/)
- Repository abstraction: [src/server/db/repository.ts](file:///c:/Users/KARAN/Desktop/Web%20Development/Anti%20Gravity/Jobs%20Curator/oneclick-jobs/src/server/db/repository.ts)
- Sync Service: [src/server/db/sync.ts](file:///c:/Users/KARAN/Desktop/Web%20Development/Anti%20Gravity/Jobs%20Curator/oneclick-jobs/src/server/db/sync.ts)
- AI Provider: [src/server/ai/provider.ts](file:///c:/Users/KARAN/Desktop/Web%20Development/Anti%20Gravity/Jobs%20Curator/oneclick-jobs/src/server/ai/provider.ts)
