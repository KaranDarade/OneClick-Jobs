# API-03: Job Synchronization Sequence Diagram (`POST /api/sync`)

## 1. Sequence Diagram: Ingestion & Sync Execution

```mermaid
sequenceDiagram
    autonumber
    actor Trigger as Admin / Automated Cron
    participant API as POST /api/sync
    participant Sync as JobSyncService
    participant Providers as Provider Clients (GH, Lever, Ashby, ROK)
    participant Repo as IJobRepository
    participant Audit as source_sync_runs

    Trigger->>API: POST /api/sync
    API->>Sync: syncAllSources()

    par Fetch All Active Providers
        Sync->>Providers: search() / getJobs()
        Providers-->>Sync: Raw Job Batches
    end

    Sync->>Sync: Filter Software Roles & Normalize Attributes
    Sync->>Sync: deduplicateJobs()
    
    Sync->>Repo: upsertJobs(uniqueJobs)
    Repo-->>Sync: { inserted: 24, updated: 86 }

    Sync->>Audit: recordSyncRun(metrics)
    Audit-->>Sync: Audit Log Saved

    Sync-->>API: Aggregate SyncResult Map
    API-->>Trigger: 200 OK JSON { success: true, timestamp, results }
```

---

## 2. Telemetry Recorded in `source_sync_runs`
For each provider, the orchestrator logs:
- `source_id`: Source identifier (e.g. `'greenhouse'`).
- `status`: `'success'`, `'partial'`, or `'failed'`.
- `jobs_found`: Count of harvested items.
- `jobs_inserted`: Count of newly created listings.
- `jobs_updated`: Count of refreshed existing records.
- `duration_ms`: Execution time in milliseconds.
