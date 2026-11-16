# WF-01: Job Aggregation & Ingestion Pipeline

## 1. Purpose & Scope
This workflow document outlines the automated and on-demand job ingestion pipeline in **OneClick Jobs**. It details how raw job listings are harvested in parallel from Greenhouse, Lever, Ashby, and RemoteOK, filtered through the software gate, normalized, deduplicated, and committed to storage.

---

## 2. Mermaid Diagram: Aggregation Pipeline Flow

```mermaid
sequenceDiagram
    autonumber
    actor Caller as Cron / Admin User
    participant Route as POST /api/sync
    participant Sync as JobSyncService
    participant GH as GreenhouseClient
    participant Lever as LeverClient
    participant Ashby as AshbyClient
    participant ROK as RemoteOkClient
    participant Gate as isSoftwareEngineeringJob()
    participant Norm as normalizeJob()
    participant Dedup as deduplicateJobs()
    participant Repo as IJobRepository
    participant Audit as source_sync_runs

    Caller->>Route: Trigger Sync Request
    Route->>Sync: syncAllSources()
    
    par Concurrent Fetch
        Sync->>GH: search()
        GH-->>Sync: Raw Greenhouse Jobs
    and
        Sync->>Lever: search()
        Lever-->>Sync: Raw Lever Jobs
    and
        Sync->>Ashby: search()
        Ashby-->>Sync: Raw Ashby Jobs
    and
        Sync->>ROK: getJobs(50)
        ROK-->>Sync: Raw RemoteOK Jobs
    end

    loop For each Raw Job
        Sync->>Gate: Evaluate Title, Description & Skills
        alt Non-Software Job
            Gate-->>Sync: Discard (False)
        else Software Engineering Job
            Gate-->>Sync: Approve (True)
            Sync->>Norm: Normalize Discipline, Seniority, Metro City
            Norm-->>Sync: Normalized Job Object
        end
    end

    Sync->>Dedup: Deduplicate Aggregated Set
    Note over Dedup: Generates hash keys and resolves ATS priority collisions
    Dedup-->>Sync: Unique Deduplicated Jobs

    Sync->>Repo: upsertJobs(uniqueJobs)
    Repo-->>Sync: { inserted: X, updated: Y }

    Sync->>Audit: recordSyncRun(status, duration, metrics)
    Audit-->>Sync: Recorded

    Sync-->>Route: Return SyncResults Summary
    Route-->>Caller: 200 OK JSON Response
```

---

## 3. Resilience & Isolation Mechanisms
1. **Parallel Execution with Error Isolation**: Ingestion queries are triggered concurrently using `Promise.allSettled()`. If a single provider fails (e.g. Lever returns 502 Bad Gateway), other providers (Greenhouse, Ashby, RemoteOK) complete normally without aborting the entire sync run.
2. **Rate Limiting & Concurrency Throttling**: Requests to external ATS endpoints are sent with a custom `User-Agent` and respect HTTP 429 rate limit responses with exponential backoff.
3. **Database Write Batching**: Supabase upserts utilize `Prefer: resolution=merge-duplicates` batch writes to minimize HTTP round-trips.
