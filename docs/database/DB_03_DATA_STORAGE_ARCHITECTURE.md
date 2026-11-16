# DB-03: Data Storage Architecture & Persistence Matrix

## 1. Purpose & Scope
This document details the multi-layered storage topology of **OneClick Jobs**, contrasting server-side persistence engines, transient in-memory caches, browser-scoped web storage, and external API buffers.

---

## 2. Mermaid Diagram: Multi-Tier Data Storage Topology

```mermaid
flowchart TD
    subgraph ClientStorage["Client-Side Browser Storage (Zero Server Retention)"]
        LS["localStorage<br/>Key: 'oneclick_saved_jobs_v1'<br/>• Stores SavedJob[] (bookmarks)<br/>• Persists across browser sessions"]
        SS["sessionStorage<br/>Key: 'oneclick_candidate_profile_v1'<br/>• Stores CandidateProfile (skills, exp, projects)<br/>• Scoped strictly to active browser tab"]
    end

    subgraph ServerlessMemory["Serverless Process Memory (Node.js Ephemeral RAM)"]
        EPHEMERAL_PDF["PDF Stream Buffer<br/>• Scope: Single HTTP Request<br/>• Discarded immediately after unpdf extraction"]
        MEM_CACHE["MemoryCache<T><br/>• TTL: 5 minutes<br/>• In-memory search & query result cache"]
        MEM_REPO["InMemoryJobRepository<br/>• Static seed fixtures + dynamic memory jobs<br/>• Active when Supabase is not configured"]
    end

    subgraph ManagedCloudStorage["Managed Cloud Persistence (Supabase Cloud)"]
        PG_DB[(Supabase PostgreSQL 15.x)]
        PG_DB --- T_JOBS["jobs (Canonical Job Listings)"]
        PG_DB --- T_SOURCES["job_sources (Provider Catalog)"]
        PG_DB --- T_RUNS["source_sync_runs (Audit History)"]
        PG_DB --- T_SAVED["saved_jobs (Cloud Bookmarks Sync)"]
    end

    subgraph UpstreamAPIs["Upstream Remote Storage (Source of Truth)"]
        ATS_SERVERS["External ATS Databases<br/>(Greenhouse, Lever, Ashby, RemoteOK)"]
    end

    %% Flows
    ATS_SERVERS -->|HTTP GET Fetch| ServerlessMemory
    ServerlessMemory -->|Normalized Upsert (If Configured)| PG_DB
    PG_DB -->|Repository Query| MEM_CACHE
    MEM_CACHE -->|JSON Payload| ClientStorage
```

---

## 3. Storage Persistence Matrix

| Storage Layer | Physical Location | Data Entities Stored | Survives Server Restart? | Survives Browser Reload? | Retention Policy / TTL | Privacy / Security Level |
|---|---|---|---|---|---|---|
| **Supabase PostgreSQL** | AWS / Supabase Cloud DB | `jobs`, `job_sources`, `source_sync_runs`, `saved_jobs` | **Yes** | **Yes** | Permanent until purged/archived | Encrypted at rest (AES-256), SSL in transit |
| **InMemoryJobRepository** | Node.js Process Heap | In-memory `Job[]` list + static demo fixtures | **No** (Wiped on process exit) | **Yes** (Client re-queries on reload) | Process lifetime | Ephemeral server RAM |
| **Server `MemoryCache`** | Node.js Process Heap | Query results, filtered candidate feeds | **No** | **Yes** (Re-evaluated on miss) | 5 minutes TTL (LRU-style expiry) | Ephemeral server RAM |
| **PDF Extraction Buffer** | Node.js Process Heap | Raw uploaded binary PDF chunks | **No** | **No** | Single request lifetime (<2 seconds) | Ephemeral RAM, zero disk write, 100% private |
| **Browser `sessionStorage`** | Client Browser RAM / Sandbox | `CandidateProfile` (skills, projects, target role) | **Yes** | **Yes** (Lost on tab close) | Current tab session lifetime | Client-isolated, zero server upload |
| **Browser `localStorage`** | Client Disk / Browser Sandbox | `SavedJob[]` (Bookmarked jobs) | **Yes** | **Yes** | Indefinite until user clears browser cache | Client-isolated, zero server upload |
| **External ATS Endpoints** | Greenhouse, Lever, Ashby | Upstream company job listings | **Yes** | **Yes** | Controlled by external ATS companies | Authoritative external source |

---

## 4. Architectural Guarantees & Fallback Modes
1. **Zero-Configuration Autonomous Mode**:
   When neither `NEXT_PUBLIC_SUPABASE_URL` nor `SUPABASE_SERVICE_ROLE_KEY` is present, `getJobRepository()` instantiates `InMemoryJobRepository`. The system runs out-of-the-box without requiring a database installation or Docker daemon.
2. **Privacy By Design Guarantee**:
   The user's resume PDF is **never written to disk or uploaded to any S3/Supabase storage bucket**. The stream is piped directly into `unpdf`, parsed for skill keywords, mapped into a lightweight JSON profile, returned to the browser, and immediately garbage-collected by the Node.js runtime.
