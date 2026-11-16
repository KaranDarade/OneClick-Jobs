# API-08: Database Fallback Sequence Diagram

## 1. Sequence Diagram: Supabase Exception Interception & Fallback

```mermaid
sequenceDiagram
    autonumber
    actor Client as API Route Handler
    participant SupaRepo as SupabaseJobRepository
    participant Cloud as Supabase PostgREST (AWS)
    participant MemRepo as InMemoryJobRepository (this.fallback)

    Client->>SupaRepo: queryJobs(options)
    SupaRepo->>Cloud: fetch(supabaseUrl + "/jobs?...")
    
    alt Network Disconnected / 500 Internal Error / Invalid Credentials
        Cloud-->>SupaRepo: Throws Network Error / HTTP 500
        Note over SupaRepo: Catch exception in try/catch block
        SupaRepo->>MemRepo: queryJobs(options)
        MemRepo-->>SupaRepo: Return In-Memory Job Results
        SupaRepo-->>Client: { jobs, total } (Seamless Fallback)
    else Cloud Responds Normally (200 OK)
        Cloud-->>SupaRepo: JSON Rows
        SupaRepo-->>Client: Normalized Jobs List
    end
```

---

## 2. Zero-Crash Reliability
Because `SupabaseJobRepository` encapsulates an instance of `InMemoryJobRepository`, third-party database downtime does not disrupt API availability.
