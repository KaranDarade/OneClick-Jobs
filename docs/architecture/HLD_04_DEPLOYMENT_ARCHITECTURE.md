# HLD-04: Deployment & Infrastructure Architecture

## 1. Purpose & Scope
This document details the physical and logical deployment topology for **OneClick Jobs**, contrasting the local development environment with the production cloud deployment on **Vercel** and **Supabase Cloud**.

---

## 2. Mermaid Diagram: Deployment Topology

```mermaid
flowchart TB
    subgraph ClientEnvironment["End-User Client Environment"]
        USER_AGENT["Modern Web Browser<br/>[Chrome / Firefox / Edge / Safari]<br/>• HTML5, ES2022, CSS Modules<br/>• sessionStorage: CandidateProfile<br/>• localStorage: SavedJobs"]
    end

    subgraph EdgeCDN["Vercel Global Edge Network (Anycast CDN)"]
        EDGE_ROUTER["Vercel Edge Gateway / DNS<br/>• SSL/TLS Termination (HTTPS 443)<br/>• DDoS & WAF Protection<br/>• Edge Caching for Static Assets"]
        STATIC_STORE["Next.js Static Assets (_next/static/)<br/>• Compiled React Chunks<br/>• Minified Tailwind CSS<br/>• SVG Icons & Web Fonts"]
    end

    subgraph ComputeTier["Vercel Serverless Compute (AWS us-east-1 / Dynamic)"]
        subgraph ServerlessLambda["Next.js Node.js 20.x Serverless Function"]
            SERVER_RUNTIME["Next.js App Engine<br/>• App Router Server Components (RSC)<br/>• Route Handlers (/api/*)<br/>• In-Memory Job Repository<br/>• In-Memory Deduplication Engine<br/>• In-Memory TTL Cache (MemoryCache)"]
            PDF_WORKER["In-Memory PDF Parser (unpdf)<br/>• Zero disk write / Ephemeral execution"]
        end
    end

    subgraph DatabaseTier["Managed Persistence: Supabase Cloud"]
        subgraph SupabaseInfra["Supabase PostgreSQL 15.x"]
            PG_POOL["PgBouncer Connection Pooler (Port 6543 / 5432)<br/>• SSL/TLS Encrypted Connection"]
            PG_DB["PostgreSQL Instance<br/>• Table: jobs (GIN index on skills & tsvector)<br/>• Table: job_sources<br/>• Table: source_sync_runs<br/>• Table: saved_jobs"]
        end
    end

    subgraph ExternalSaaS["Upstream External Cloud Services"]
        subgraph ATSNetworks["Public ATS APIs (HTTPS 443)"]
            GH_API["Greenhouse Public API<br/>boards-api.greenhouse.io"]
            LEVER_API["Lever Postings API<br/>api.lever.co/v0"]
            ASHBY_API["Ashby Public API<br/>api.ashbyhq.com"]
            ROK_API["RemoteOK API<br/>remoteok.com/api"]
        end

        subgraph AISaaS["AI Provider Endpoints"]
            GEMINI_API["Google Generative AI API<br/>generativelanguage.googleapis.com<br/>• Model: gemini-2.0-flash"]
        end
    end

    %% Network flows
    USER_AGENT -->|HTTPS 443| EDGE_ROUTER
    EDGE_ROUTER -->|Static Asset Cache Hit| STATIC_STORE
    EDGE_ROUTER -->|Dynamic SSR / API Request| SERVER_RUNTIME

    SERVER_RUNTIME -->|Multipart Upload Stream| PDF_WORKER
    SERVER_RUNTIME -->|REST / PostgREST (Optional)| PG_POOL
    PG_POOL --> PG_DB

    SERVER_RUNTIME -->|Fetch JSON (Outbound HTTPS)| ATSNetworks
    SERVER_RUNTIME -->|SDK Generation (Outbound HTTPS)| AISaaS
```

---

## 3. Environment Topologies: Production vs. Local

| Dimension | Local Development (`npm run dev`) | Production (`Vercel + Supabase`) |
|---|---|---|
| **Runtime Host** | Local Node.js 20.x on Windows/macOS/Linux | Vercel Serverless Functions (AWS Lambda containerized) |
| **Port / Protocol** | `http://localhost:3000` | `https://oneclickjobs.vercel.app` (TLS 1.3) |
| **Default Storage** | `InMemoryJobRepository` (zero setup required) | `SupabaseJobRepository` (if env vars set) or `InMemoryJobRepository` |
| **Cache Lifetime** | Process memory (resets on dev server restart) | Lambda instance memory (isolated per cold start, 5m TTL) |
| **Static Delivery** | Next.js local development compiler | Vercel Global Edge Network CDN |
| **PDF Extraction** | Streamed directly into Node.js buffer via `unpdf` | Streamed directly into Serverless memory buffer via `unpdf` |
| **AI Provider** | `DeterministicFallbackProvider` (or Gemini if key set) | `GeminiAIProvider` (via `GEMINI_API_KEY`) with automatic fallback |

---

## 4. Configuration & Environment Variables

All secrets and connection parameters are injected via environment variables:

| Variable Name | Required? | Service Scope | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Optional | Data Tier | URL of the Supabase PostgreSQL project instance. |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional | Data Tier | Admin service key allowing backend sync operations to write to `jobs`. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`| Optional | Data Tier | Client-side anonymous public key for Supabase interactions. |
| `GEMINI_API_KEY` | Optional | AI Tier | API key for Google Gemini 2.0 Flash (`@google/genai`). |
| `GOOGLE_AI_API_KEY` | Optional | AI Tier | Alternative alias for Google Gemini API key. |
| `JOBVETTA_API_KEY` | Optional | ATS Tier | Secret key for Jobvetta aggregator provider. |
| `ADZUNA_APP_ID` | Optional | ATS Tier | Application ID for Adzuna job search API. |
| `ADZUNA_APP_KEY` | Optional | ATS Tier | Application Secret Key for Adzuna job search API. |
| `JOOBLE_API_KEY` | Optional | ATS Tier | Secret API key for Jooble aggregator service. |
| `APIFY_API_TOKEN` | Optional | ATS Tier | API Token for Apify actor-based scrapers. |

> [!NOTE]
> If zero environment variables are configured, OneClick Jobs boots into a **100% operational zero-dependency mode**, utilizing `InMemoryJobRepository`, active keyless ATS providers (Greenhouse, Lever, Ashby, RemoteOK), and `DeterministicFallbackProvider`.

---

## 5. Security & Isolation Controls
- **Stateless Serverless Execution**: Serverless functions do not persist state to local disk.
- **Zero Candidate Data Retention**: Candidate resumes and parsed profile details never touch the database or local disk. PDF buffers are processed strictly in RAM and discarded immediately.
- **Keyless Public ATS Harvesters**: Active job providers fetch exclusively from publicly accessible ATS candidate portals, avoiding bot challenges or credential leakage.
- **TLS 1.3 Everywhere**: All inbound client traffic and outbound API requests travel exclusively over encrypted HTTPS channels.
