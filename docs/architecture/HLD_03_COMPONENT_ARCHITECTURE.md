# HLD-03: Component Architecture (C4 Level 3)

## 1. Purpose & Scope
The Component Architecture diagram decomposes the **OneClick Jobs** containers into their internal logical components. It maps UI widgets, custom hooks, API route handlers, domain processing engines, data repositories, and provider clients to show their exact interaction contracts and dependencies.

---

## 2. Mermaid Diagram: Component Architecture (C4 Level 3)

```mermaid
flowchart TB
    subgraph UIComponents["Presentation Layer Components (src/components/)"]
        direction TB
        PAGE["App Main Page<br/>[src/app/page.tsx]"]
        HEADER["Header & Navigation<br/>[Header.tsx]"]
        SEARCH_CTRL["SearchControls & Presets<br/>[SearchControls.tsx]"]
        FILTER_PNL["FilterPanel (Discipline/Exp/Work)<br/>[FilterPanel.tsx]"]
        JOB_FEED["Job Feed & Virtual Grid<br/>[src/app/page.tsx]"]
        JOB_CARD["JobCard (Badges/Score/Actions)<br/>[JobCard.tsx]"]
        MODAL["JobDetailModal & Drawer<br/>[JobDetailModal.tsx]"]
        RESUME_UI["ResumeUpload (Drag & Drop)<br/>[ResumeUpload.tsx]"]
        AI_ASSIST["AiMatchAssistant (Cover Letter/Fit)<br/>[AiMatchAssistant.tsx]"]
        EXT_LINKS["ExternalSearchLinks (Naukri/LinkedIn/Indeed)<br/>[ExternalSearchLinks.tsx]"]
        SYNC_MODAL["SyncStatusModal (Aggregator Trigger)<br/>[SyncStatusModal.tsx]"]

        PAGE --> HEADER
        PAGE --> SEARCH_CTRL
        PAGE --> FILTER_PNL
        PAGE --> RESUME_UI
        PAGE --> JOB_FEED
        JOB_FEED --> JOB_CARD
        PAGE --> MODAL
        MODAL --> AI_ASSIST
        PAGE --> EXT_LINKS
        PAGE --> SYNC_MODAL
    end

    subgraph ClientHooks["Client State Hooks (src/features/jobs/)"]
        USE_PROFILE["useCandidateProfile()<br/>• candidateProfile state<br/>• sessionStorage sync"]
        USE_SAVED["useSavedJobs()<br/>• savedJobs / toggleSave()<br/>• localStorage sync"]
    end

    PAGE --> USE_PROFILE
    PAGE --> USE_SAVED
    JOB_CARD --> USE_SAVED
    MODAL --> USE_PROFILE

    subgraph APIRoutes["Next.js Route Handlers (src/app/api/)"]
        ROUTE_JOBS["GET /api/jobs<br/>[src/app/api/jobs/route.ts]"]
        ROUTE_JOB_ID["GET /api/jobs/[id]<br/>[src/app/api/jobs/[id]/route.ts]"]
        ROUTE_SYNC["POST /api/sync<br/>[src/app/api/sync/route.ts]"]
        ROUTE_RESUME["POST /api/resume/parse<br/>[src/app/api/resume/parse/route.ts]"]
        ROUTE_AI["POST /api/jobs/[id]/ai-analysis<br/>[src/app/api/jobs/[id]/ai-analysis/route.ts]"]
        ROUTE_HEALTH["GET /api/health<br/>[src/app/api/health/route.ts]"]
    end

    SEARCH_CTRL -.->|HTTP GET| ROUTE_JOBS
    JOB_CARD -.->|HTTP GET (Optional)| ROUTE_JOB_ID
    RESUME_UI -.->|HTTP POST (PDF)| ROUTE_RESUME
    AI_ASSIST -.->|HTTP POST| ROUTE_AI
    SYNC_MODAL -.->|HTTP POST| ROUTE_SYNC

    subgraph DomainEngines["Domain Services (src/server/)"]
        SEARCH_SVC["Search Service<br/>[src/server/jobs/search.ts]<br/>• filterJobs()<br/>• rankJobs()"]
        NORM_SVC["Normalization Service<br/>[src/server/jobs/normalization.ts]<br/>• normalizeJob()<br/>• normalizeDiscipline()<br/>• normalizeSeniority()<br/>• normalizeLocation()"]
        DEDUP_SVC["Deduplication Engine<br/>[src/server/jobs/deduplication.ts]<br/>• deduplicateJobs()<br/>• buildDedupKey()"]
        SYNC_SVC["JobSyncService<br/>[src/server/db/sync.ts]<br/>• syncAllSources()<br/>• syncSource()"]
        RESUME_SVC["Resume Parser Service<br/>[src/server/resume/skills.ts]<br/>• parseResume()<br/>• extractSkills()<br/>• inferSeniority()"]
        SCORING_SVC["Matching & Scoring Engine<br/>[src/server/matching/scoring.ts]<br/>• calculateMatchScore()<br/>• assessEligibility()"]
        AI_SVC["AI Provider Service<br/>[src/server/ai/provider.ts]<br/>• getAIProvider()<br/>• GeminiAIProvider<br/>• DeterministicFallbackProvider"]
    end

    ROUTE_JOBS --> SEARCH_SVC
    ROUTE_JOB_ID --> SEARCH_SVC
    ROUTE_SYNC --> SYNC_SVC
    ROUTE_RESUME --> RESUME_SVC
    ROUTE_AI --> AI_SVC

    subgraph Providers["Provider Clients (src/server/providers/)"]
        BASE_PROV["IJobProvider<br/>[base.ts]"]
        GH_PROV["GreenhouseJobProvider<br/>[greenhouse.ts]"]
        LEVER_PROV["LeverJobProvider<br/>[lever.ts]"]
        ASHBY_PROV["AshbyJobProvider<br/>[ashby.ts]"]
        REMOTEOK_PROV["RemoteOKJobProvider<br/>[remoteok.ts]"]
        OPT_PROV["Jobvetta/Adzuna/Jooble/Apify<br/>[Key-based Optional]"]
    end

    SYNC_SVC --> BASE_PROV
    BASE_PROV <|-- GH_PROV
    BASE_PROV <|-- LEVER_PROV
    BASE_PROV <|-- ASHBY_PROV
    BASE_PROV <|-- REMOTEOK_PROV
    BASE_PROV <|-- OPT_PROV

    subgraph DataAccess["Data Access Subsystem (src/server/db/)"]
        IREPO["IJobRepository<br/>[repository.ts]"]
        MEM_REPO["InMemoryJobRepository<br/>[repository.ts]"]
        SUPA_REPO["SupabaseJobRepository<br/>[repository.ts]"]
        CACHE_MGR["MemoryCache<T><br/>[cache.ts]"]
    end

    SEARCH_SVC --> IREPO
    SYNC_SVC --> IREPO
    IREPO <|-- MEM_REPO
    IREPO <|-- SUPA_REPO
    SEARCH_SVC --> CACHE_MGR
```

---

## 3. Component Details & Interactions

### 3.1 Frontend Presentation Tier
| Component | File Path | Primary Responsibilities |
|---|---|---|
| `SearchControls` | `src/components/SearchControls.tsx` | Captures keyword search, quick role presets (Frontend, Backend, AI/ML, Fresher), and triggers debounced URL query param updates. |
| `FilterPanel` | `src/components/FilterPanel.tsx` | Controls multi-attribute facet filtering: Tech Discipline (9 options), Experience Level (6 tiers), Work Arrangement (remote, hybrid, on-site), and Quick Indian Metro location buttons. |
| `ResumeUpload` | `src/components/ResumeUpload.tsx` | Drag-and-drop file upload for PDF resumes. Sends raw binary to `/api/resume/parse` and updates candidate profile state. |
| `AiMatchAssistant` | `src/components/AiMatchAssistant.tsx` | Modal overlay tab providing real-time AI breakdown of candidate fit, missing skill gaps, and generating personalized cover letter starters. |
| `ExternalSearchLinks`| `src/components/ExternalSearchLinks.tsx` | Deep-links user queries to LinkedIn, Naukri, Indeed, and Google Jobs with prefilled role and location parameters. |
| `SyncStatusModal` | `src/components/SyncStatusModal.tsx` | Displays sync diagnostics, source execution status, and lets administrators manually trigger job sync runs. |

### 3.2 Client State Hooks
| Hook | File Path | State & Storage Binding |
|---|---|---|
| `useCandidateProfile` | `src/features/jobs/useCandidateProfile.ts` | Manages active candidate skills, extracted projects, detected experience years, and target role in `sessionStorage` (`oneclick_candidate_profile_v1`). |
| `useSavedJobs` | `src/features/jobs/useSavedJobs.ts` | Manages bookmarked job IDs and full job objects in `localStorage` (`oneclick_saved_jobs_v1`). |

### 3.3 Core Server Services & Contracts
- **`src/server/jobs/normalization.ts`**:
  - `normalizeJob(rawJob)`: Converts heterogeneous provider payloads into a strongly typed `Job` domain object.
  - Software Role Filtering Gate: Eliminates non-software roles (sales, legal, nursing, customer support).
  - Indian Tech Metro Resolver: Maps variants (e.g. "Blr", "Bengaluru", "Cyber City Gurgaon") to canonical cities (`Bengaluru`, `Hyderabad`, `Pune`, `Delhi NCR`, `Mumbai`, `Chennai`).
- **`src/server/jobs/deduplication.ts`**:
  - `buildDedupKey(job)`: Normalizes company name, title, and location into a deterministic hash key.
  - Direct ATS Preference: If a job is aggregated from both Greenhouse and RemoteOK, the direct ATS entry is preserved.
- **`src/server/resume/skills.ts`**:
  - Uses `unpdf` to extract raw text buffers in-memory.
  - Evaluates text against a 200+ technology taxonomy dictionary.
  - Distinguishes college degrees and graduation years to accurately identify Freshers (0 years).
- **`src/server/matching/scoring.ts`**:
  - Computes multi-factor match score (0-100) weighting skills (60%), experience tier (25%), and location/arrangement (15%).
  - Applies a seniority mismatch penalty if a junior candidate applies for a lead/principal role.
- **`src/server/ai/provider.ts`**:
  - Factory pattern (`getAIProvider()`) selecting `GeminiAIProvider` if API keys are configured, otherwise falling back seamlessly to `DeterministicFallbackProvider`.

---

## 4. Verification References
- Frontend Components: [src/components/](file:///c:/Users/KARAN/Desktop/Web%20Development/Anti%20Gravity/Jobs%20Curator/oneclick-jobs/src/components/)
- Client Hooks: [src/features/jobs/](file:///c:/Users/KARAN/Desktop/Web%20Development/Anti%20Gravity/Jobs%20Curator/oneclick-jobs/src/features/jobs/)
- Server Domain Logic: [src/server/](file:///c:/Users/KARAN/Desktop/Web%20Development/Anti%20Gravity/Jobs%20Curator/oneclick-jobs/src/server/)
