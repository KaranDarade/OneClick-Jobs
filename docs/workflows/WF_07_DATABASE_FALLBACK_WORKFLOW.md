# WF-07: Database Resolution & Graceful Fallback Workflow

## 1. Purpose & Scope
This workflow specifies how **OneClick Jobs** resolves database persistence at boot time and during runtime execution. It demonstrates how `getJobRepository()` and `SupabaseJobRepository` implement a zero-crash architecture using the `InMemoryJobRepository` fallback.

---

## 2. Mermaid Diagram: Database Fallback Decision Tree

```mermaid
flowchart TD
    BOOT["Application / Request Starts"] --> GET_REPO["Invoke getJobRepository()"]

    GET_REPO --> CHECK_ENV{"Are NEXT_PUBLIC_SUPABASE_URL &<br/>SUPABASE_SERVICE_ROLE_KEY set?"}

    CHECK_ENV -- No --> INST_IN_MEM["Instantiate InMemoryJobRepository<br/>• Seeds demo fixtures<br/>• In-process heap storage"]
    CHECK_ENV -- Yes --> INST_SUPA["Instantiate SupabaseJobRepository<br/>• Initializes Supabase HTTP client<br/>• Initializes private fallback = new InMemoryJobRepository()"]

    INST_IN_MEM --> REPO_READY["Repository Ready for Service"]
    INST_SUPA --> REPO_READY

    REPO_READY --> RUN_OP["Execute Repository Operation<br/>(e.g., queryJobs() or getJobById())"]

    RUN_OP --> IS_SUPA{"Is Supabase Repository?"}
    IS_SUPA -- No --> MEM_OP["Execute against In-Memory Map"]
    IS_SUPA -- Yes --> TRY_SUPA["Attempt Supabase PostgREST Call<br/>fetch(supabaseUrl + endpoint)"]

    TRY_SUPA --> SUPA_OK{"Response OK (200)?"}
    SUPA_OK -- Yes --> RETURN_DATA["Parse & Return Supabase Rows"]
    
    SUPA_OK -- No (Network error / Auth failure / Table missing) --> CATCH_ERR["Catch Supabase Exception<br/>Log diagnostic warning"]
    CATCH_ERR --> FALLBACK_EXEC["Delegate to this.fallback.operation()<br/>(InMemoryJobRepository)"]
    FALLBACK_EXEC --> RETURN_FALLBACK["Return In-Memory Data Without Crashing"]
```

---

## 3. Reliability & Zero-Downtime Principles

### 3.1 Bootstrap Resilience
Developers or evaluators can run `npm run dev` immediately after cloning the repository without configuring Supabase, Docker, or environment variables. The system boots directly into `InMemoryJobRepository`.

### 3.2 Runtime Fault Tolerance
If Supabase experiences an infrastructure outage, DNS resolution timeout, or invalid API credentials mid-flight:
1. `SupabaseJobRepository` wraps all PostgREST operations in `try/catch` blocks.
2. Caught exceptions do not propagate as unhandled 500 errors to the client.
3. The query is immediately redirected to `this.fallback`, ensuring continuous, uninterrupted service to job seekers.
