# HLD-01: System Context Diagram (C4 Level 1)

## 1. Purpose & Scope
The System Context Diagram provides a bird's-eye architectural view of the **OneClick Jobs (Job Curator)** platform. It illustrates the primary system boundaries, user personas, active external integrations, optional enterprise services, and hosting infrastructure.

---

## 2. Mermaid Diagram: System Context

```mermaid
flowchart TB
    subgraph Users["Candidate & Job Seekers"]
        CANDIDATE["Candidate / Job Seeker<br/>[India Tech Developer / Fresher]"]
    end

    subgraph ClientTier["Client Runtime (User Device)"]
        BROWSER["Web Browser<br/>[Next.js Client Runtime]<br/>• React 19 Client Tree<br/>• sessionStorage (Profile)<br/>• localStorage (Saved Jobs)"]
    end

    subgraph CorePlatform["OneClick Jobs Platform (Next.js 16.4.3 on Vercel)"]
        NEXT_SERVER["OneClick Jobs Server Engine<br/>[Node.js Serverless Environment]<br/>• App Router & Route Handlers<br/>• In-Memory Deduplication Engine<br/>• Normalization & Curation Gates<br/>• In-Memory TTL Cache<br/>• In-Memory Resume Parser (unpdf)"]
    end

    subgraph FreeJobSources["Active Keyless ATS Providers (100% Free Forever)"]
        GH["Greenhouse Public Boards<br/>boards-api.greenhouse.io<br/>[Stripe, Rubrik, Workato, Figma]"]
        LEVER["Lever Public Postings<br/>api.lever.co/v0<br/>[Paytm, Meesho, CRED]"]
        ASHBY["Ashby Job Boards<br/>api.ashbyhq.com<br/>[Supabase, Linear, Sentry, Resend]"]
        REMOTEOK["RemoteOK Free Feed<br/>remoteok.com/api<br/>[Global Remote Tech Feed]"]
    end

    subgraph OptionalJobSources["Key-Based Aggregators (Optional / Inactive)"]
        JOBVETTA["Jobvetta API<br/>[JOBVETTA_API_KEY]"]
        ADZUNA["Adzuna API<br/>[ADZUNA_APP_ID & KEY]"]
        JOOBLE["Jooble API<br/>[JOOBLE_API_KEY]"]
        APIFY["Apify Scraper<br/>[APIFY_API_TOKEN]"]
    end

    subgraph ExternalJobPortals["Direct Exploration Portals (Client Deep-Links)"]
        LINKEDIN["LinkedIn Jobs<br/>linkedin.com/jobs/search"]
        NAUKRI["Naukri.com<br/>naukri.com"]
        INDEED["Indeed India<br/>in.indeed.com"]
        GJOBS["Google Jobs<br/>google.com/search?ibp=htl;jobs"]
    end

    subgraph AIServices["AI & LLM Services"]
        GEMINI["Google Gemini 2.0 Flash<br/>[GEMINI_API_KEY / GOOGLE_AI_API_KEY]<br/>• Career Match Explanation<br/>• Cover Letter Starter"]
        AI_FALLBACK["Deterministic Fallback Engine<br/>[Local Rules Engine (Zero Cost)]"]
    end

    subgraph StorageServices["Data Persistence Layer"]
        SUPABASE["Supabase PostgreSQL<br/>[SUPABASE_URL & KEY]<br/>(Optional Managed Cloud Store)"]
        IN_MEMORY_REPO["InMemoryJobRepository<br/>[Default Resilient In-Memory Map]"]
    end

    %% User Interactions
    CANDIDATE -->|Visits & Interacts via HTTPS| BROWSER
    BROWSER -->|Dispatches Filter/Search Requests| NEXT_SERVER
    BROWSER -->|Uploads PDF Resume in-memory| NEXT_SERVER
    BROWSER -->|One-Click Direct Portal Search| ExternalJobPortals

    %% Server to Free Providers
    NEXT_SERVER -->|HTTPS GET (15m Cache)| GH
    NEXT_SERVER -->|HTTPS GET (15m Cache)| LEVER
    NEXT_SERVER -->|HTTPS GET (15m Cache)| ASHBY
    NEXT_SERVER -->|HTTPS GET (15m Cache)| REMOTEOK

    %% Server to Optional Providers
    NEXT_SERVER -.->|HTTPS Query if Key Present| JOBVETTA
    NEXT_SERVER -.->|HTTPS Query if Key Present| ADZUNA
    NEXT_SERVER -.->|HTTPS Query if Key Present| JOOBLE
    NEXT_SERVER -.->|HTTPS Query if Key Present| APIFY

    %% Server to AI
    NEXT_SERVER -->|Calls if Key Present| GEMINI
    NEXT_SERVER -->|Default Fallback| AI_FALLBACK

    %% Server to Database
    NEXT_SERVER -.->|REST v1 if Configured| SUPABASE
    NEXT_SERVER -->|Default Operational Store| IN_MEMORY_REPO
```

---

## 3. Component Details & Integrations

| Participant | Classification | Verification Status | Implementation File |
|---|---|---|---|
| **Candidate / Job Seeker** | Primary Persona | Active | N/A |
| **Client Browser** | User Agent | Active | `src/app/`, `src/components/` |
| **Next.js Serverless Engine** | Core Application | Active | `src/app/api/`, `src/server/` |
| **Greenhouse Public Boards** | Job Ingestion ATS | Active (Keyless) | `src/server/providers/greenhouse/client.ts` |
| **Lever Public Postings** | Job Ingestion ATS | Active (Keyless) | `src/server/providers/lever/client.ts` |
| **Ashby Job Boards** | Job Ingestion ATS | Active (Keyless) | `src/server/providers/ashby/client.ts` |
| **RemoteOK Public Feed** | Job Ingestion Aggregator | Active (Keyless) | `src/server/providers/remoteok/client.ts` |
| **Jobvetta API** | Job Aggregator | Optional (Key-based) | `src/server/providers/jobvetta/client.ts` |
| **Adzuna / Jooble / Apify** | Job Aggregators | Optional (Key-based) | `src/server/providers/{adzuna,jooble,apify}/` |
| **Google Gemini API** | AI Provider | Optional (Key-based) | `src/server/ai/provider.ts` |
| **Deterministic Fallback Engine** | AI Provider | Active (Default) | `src/server/ai/provider.ts` |
| **Supabase PostgreSQL** | Database Repository | Optional (Key-based) | `src/server/db/repository.ts` |
| **InMemoryJobRepository** | Database Repository | Active (Default) | `src/server/db/repository.ts` |
| **External Portals (LinkedIn, Naukri, Indeed)** | Direct Search Deep-Links | Active | `src/server/providers/external-search.ts` |

---

## 4. Key Architectural Observations
1. **Zero Mandatory Paid Subscriptions**: All primary data feeds (Greenhouse, Lever, Ashby, RemoteOK) run entirely without API keys or recurring fees.
2. **Zero Disk Storage for Resumes**: PDF parsing occurs in transient server RAM via `unpdf` with buffers immediately garbage-collected.
3. **Resilient Dual-Tier Storage**: Automatically runs on `InMemoryJobRepository` if Supabase environment variables are omitted, ensuring 100% uptime in local and demo environments.
