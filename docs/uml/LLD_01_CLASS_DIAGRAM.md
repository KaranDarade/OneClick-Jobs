# LLD-01: Class Diagram & Object Architecture

## 1. Purpose & Scope
This document provides the Low-Level Design (LLD) class diagram for **OneClick Jobs**, documenting the actual classes, interfaces, methods, visibilities, and inter-class relationships implemented in the codebase.

---

## 2. Mermaid Diagram: System Class Architecture

```mermaid
classDiagram
    %% Interfaces
    class IJobRepository {
        <<interface>>
        +upsertJobs(jobs: Job[]): Promise~{inserted: number, updated: number}~
        +getJobById(id: string): Promise~Job | null~
        +queryJobs(options?: JobQueryOptions): Promise~{jobs: Job[], total: number}~
        +recordSyncRun(run: Omit~SourceSyncRun, "id"|"createdAt"~): Promise~SourceSyncRun~
        +getLatestSyncRuns(limit?: number): Promise~SourceSyncRun[]~
        +getSources(): Promise~JobSource[]~
        +clear()?: Promise~void~
    }

    class IAIProvider {
        <<interface>>
        +generateMatchExplanation(job: Job, candidate: CandidateContext, breakdown?: CompatibilityScoreResult): Promise~AIMatchAnalysis~
    }

    %% Repository Implementations
    class InMemoryJobRepository {
        -Map~string, Job~ jobs
        -SourceSyncRun[] syncRuns
        -JobSource[] sources
        +upsertJobs(jobs: Job[]): Promise~{inserted: number, updated: number}~
        +getJobById(id: string): Promise~Job | null~
        +queryJobs(options?: JobQueryOptions): Promise~{jobs: Job[], total: number}~
        +recordSyncRun(run: Omit~SourceSyncRun, "id"|"createdAt"~): Promise~SourceSyncRun~
        +getLatestSyncRuns(limit?: number): Promise~SourceSyncRun[]~
        +getSources(): Promise~JobSource[]~
        +clear(): Promise~void~
    }

    class SupabaseJobRepository {
        -string supabaseUrl
        -string serviceRoleKey
        -InMemoryJobRepository fallback
        -fetchSupabase(endpoint: string, options?: RequestInit): Promise~any~
        +upsertJobs(jobs: Job[]): Promise~{inserted: number, updated: number}~
        +getJobById(id: string): Promise~Job | null~
        +queryJobs(options?: JobQueryOptions): Promise~{jobs: Job[], total: number}~
        +recordSyncRun(run: Omit~SourceSyncRun, "id"|"createdAt"~): Promise~SourceSyncRun~
        +getLatestSyncRuns(limit?: number): Promise~SourceSyncRun[]~
        +getSources(): Promise~JobSource[]~
    }

    %% AI Providers
    class DeterministicFallbackProvider {
        +generateMatchExplanation(job: Job, candidate: CandidateContext, breakdown?: CompatibilityScoreResult): Promise~AIMatchAnalysis~
    }

    class GeminiAIProvider {
        -string apiKey
        -DeterministicFallbackProvider fallback
        +generateMatchExplanation(job: Job, candidate: CandidateContext, breakdown?: CompatibilityScoreResult): Promise~AIMatchAnalysis~
    }

    %% Sync Service
    class JobSyncService {
        -IJobRepository repo
        -GreenhouseClient greenhouse
        -LeverClient lever
        -AshbyClient ashby
        -JobvettaClient jobvetta
        -AdzunaClient adzuna
        -JoobleClient jooble
        -ApifyClient apify
        +syncGreenhouse(): Promise~SyncResult~
        +syncLever(): Promise~SyncResult~
        +syncAshby(): Promise~SyncResult~
        +syncJobvetta(): Promise~SyncResult~
        +syncAdzuna(): Promise~SyncResult~
        +syncJooble(): Promise~SyncResult~
        +syncApify(): Promise~SyncResult~
        +syncAll(): Promise~Record~string, SyncResult~~
    }

    %% Provider Clients
    class GreenhouseClient {
        -string baseUrl
        -string[] defaultBoards
        +getJobs(boardToken: string): Promise~Job[]~
        +search(query?: string): Promise~Job[]~
    }

    class LeverClient {
        -string baseUrl
        -string[] defaultSites
        +getJobs(site: string): Promise~Job[]~
        +search(query?: string): Promise~Job[]~
    }

    class AshbyClient {
        -string baseUrl
        -string[] defaultCompanies
        +getJobs(company: string): Promise~Job[]~
        +search(query?: string): Promise~Job[]~
    }

    class RemoteOkClient {
        -string baseUrl
        +getJobs(limit?: number): Promise~Job[]~
    }

    class JobvettaClient {
        -string apiKey
        -string baseUrl
        +search(params?: any): Promise~Job[]~
    }

    class AdzunaClient {
        -string appId
        -string apiKey
        -string baseUrl
        +search(query?: string): Promise~Job[]~
    }

    class JoobleClient {
        -string apiKey
        -string baseUrl
        +search(keywords?: string): Promise~Job[]~
    }

    class ApifyClient {
        -string apiToken
        +runActor(actorId: string): Promise~Job[]~
    }

    %% Utility Cache
    class MemoryCache~T~ {
        -Map~string, CacheEntry~T~~ cache
        -number defaultTtlMs
        +get(key: string): T | null
        +set(key: string, data: T, ttlMs?: number): void
        +has(key: string): boolean
        +delete(key: string): void
        +clear(): void
        +size(): number
    }

    %% Relationships
    IJobRepository <|.. InMemoryJobRepository : realizes
    IJobRepository <|.. SupabaseJobRepository : realizes
    SupabaseJobRepository --> InMemoryJobRepository : falls back to
    
    IAIProvider <|.. DeterministicFallbackProvider : realizes
    IAIProvider <|.. GeminiAIProvider : realizes
    GeminiAIProvider --> DeterministicFallbackProvider : falls back to

    JobSyncService --> IJobRepository : uses
    JobSyncService --> GreenhouseClient : orchestrates
    JobSyncService --> LeverClient : orchestrates
    JobSyncService --> AshbyClient : orchestrates
    JobSyncService --> JobvettaClient : orchestrates
    JobSyncService --> AdzunaClient : orchestrates
    JobSyncService --> JoobleClient : orchestrates
    JobSyncService --> ApifyClient : orchestrates

    RemoteOkClient ..> MemoryCache : caches responses
```

---

## 3. Structural Design Patterns Applied

### 3.1 Repository Pattern (`IJobRepository`)
- Decouples storage details from business domains.
- `InMemoryJobRepository` allows running locally or during test execution without database dependencies.
- `SupabaseJobRepository` wraps PostgREST calls with a transparent fallback to `InMemoryJobRepository` if network or credentials fail.

### 3.2 Strategy & Fallback Pattern (`IAIProvider`)
- `getAIProvider()` reads environment variables (`GEMINI_API_KEY` / `GOOGLE_AI_API_KEY`).
- If an API key is available, `GeminiAIProvider` is selected; otherwise, `DeterministicFallbackProvider` is activated.
- Even when `GeminiAIProvider` is selected, if Google API quota or network fails, it immediately catches the exception and falls back to `DeterministicFallbackProvider`.

### 3.3 Orchestrator Pattern (`JobSyncService`)
- Coordinates concurrent execution across multiple heterogeneous ATS scrapers and REST endpoints.
- Isolates errors per provider: a timeout in Lever does not abort the Greenhouse sync run.
- Reports structured `SyncResult` metrics into `source_sync_runs`.
