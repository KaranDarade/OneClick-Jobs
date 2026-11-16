# LLD-04: System State Machine Diagrams

## 1. Purpose & Scope
This document models the dynamic behavior of **OneClick Jobs** using UML State Machine diagrams. It covers the four primary state lifecycles: Job Ingestion, Resume Upload, Candidate Auto-Match, and AI Career Analysis.

---

## 2. State Machine Diagrams

### 2.1 Job Ingestion State Machine
```mermaid
stateDiagram-v2
    [*] --> Idle: Service initialized

    Idle --> PollingProviders: Sync triggered (Manual or Cron)
    
    state PollingProviders {
        [*] --> FetchGreenhouse
        [*] --> FetchLever
        [*] --> FetchAshby
        [*] --> FetchRemoteOK
    }

    PollingProviders --> FilteringSoftware: Payloads received
    
    state FilteringSoftware {
        [*] --> EvaluateTitles
        EvaluateTitles --> DropNonTech: Title is non-software
        EvaluateTitles --> RetainTech: Title is software role
    }

    FilteringSoftware --> NormalizingJobs: Retained tech jobs
    
    state NormalizingJobs {
        [*] --> MapDiscipline
        MapDiscipline --> MapSeniority
        MapSeniority --> CanonicalizeCities
    }

    NormalizingJobs --> Deduplicating: Normalized jobs list
    
    state Deduplicating {
        [*] --> GenerateSlugHash
        GenerateSlugHash --> MergeCollisions: Apply ATS priority
    }

    Deduplicating --> Persisting: Clean deduplicated jobs
    
    state Persisting {
        [*] --> UpsertRepository
        UpsertRepository --> AuditSyncRun: Log to source_sync_runs
        AuditSyncRun --> InvalidateMemoryCache: Clear 10m cache
    }

    Persisting --> Idle: Sync complete
    PollingProviders --> SyncError: Network timeout / Provider error
    SyncError --> Idle: Logged to sync runs
```

---

### 2.2 Resume Upload & Profile Extraction Lifecycle
```mermaid
stateDiagram-v2
    [*] --> UnauthenticatedAnonymous: Browser loads application
    
    UnauthenticatedAnonymous --> DragOver: Candidate drags PDF to dropzone
    DragOver --> FileSelected: File dropped (valid .pdf, size <= 5MB)
    DragOver --> UnauthenticatedAnonymous: Drag cancelled
    FileSelected --> FileRejected: Invalid extension or size > 5MB
    FileRejected --> UnauthenticatedAnonymous: Display error toast

    FileSelected --> UploadingStream: POST /api/resume/parse
    
    state UploadingStream {
        [*] --> IngestBuffer: Ephemeral Node.js RAM buffer
        IngestBuffer --> ExtractPDF: unpdf text extraction
        ExtractPDF --> MatchSkills: Match against 200+ taxonomy
        MatchSkills --> DetectFresher: Evaluate graduation / years
        DetectFresher --> ExtractProjects: Parse project bullet points
    }

    UploadingStream --> ProfileReady: JSON profile received (200 OK)
    UploadingStream --> ParseFailed: Unparseable binary or empty text
    ParseFailed --> UnauthenticatedAnonymous: Display parse error

    state ProfileReady {
        [*] --> SaveSessionStorage: Write 'oneclick_candidate_profile_v1'
        SaveSessionStorage --> BroadcastProfile: Update React context state
    }

    ProfileReady --> ProfileCleared: User clicks 'Remove Profile'
    ProfileCleared --> UnauthenticatedAnonymous: Purge sessionStorage
```

---

### 2.3 Candidate Dynamic Auto-Match Lifecycle
```mermaid
stateDiagram-v2
    [*] --> DefaultFeed: Feed sorted by relevance / date (No resume)

    DefaultFeed --> ProfileDetected: CandidateProfile active in context
    
    state ProfileDetected {
        [*] --> ExtractCandidateSkills
        ExtractCandidateSkills --> BatchCalculateScores: Loop over visible jobs
        BatchCalculateScores --> ApplySeniorityPenalty: Check fresher vs senior mismatch
    }

    ProfileDetected --> ScoredFeed: Each job receives score (0-100%)
    
    state ScoredFeed {
        [*] --> RenderScoreBadges: "95% Match", "70% Match"
        RenderScoreBadges --> SortByMatchScore: Candidate selects 'Best Match' sort
    }

    ScoredFeed --> FilterTuned: Candidate changes experience / location filter
    FilterTuned --> ScoredFeed: Re-evaluate client subset (<5ms)
```

---

### 2.4 AI Career Assistant State Machine
```mermaid
stateDiagram-v2
    [*] --> Closed: JobDetailModal is closed

    Closed --> Opened: User clicks JobCard
    Opened --> Inspection: Viewing job details, qualifications, salary

    Inspection --> RequestingAI: User clicks 'AI Fit Breakdown' tab
    
    state RequestingAI {
        [*] --> CheckGeminiKey: Check server env config
        CheckGeminiKey --> InvokeGemini: Key present -> Call gemini-2.0-flash
        CheckGeminiKey --> InvokeFallback: Key absent -> Deterministic rules
        InvokeGemini --> FallbackOnError: Gemini throws 429/500/timeout
        FallbackOnError --> InvokeFallback
    }

    RequestingAI --> DisplayingAIResults: Return structured JSON response
    
    state DisplayingAIResults {
        [*] --> RenderFitSummary: 2-sentence executive summary
        RenderFitSummary --> RenderStrengthsList: Matched core stack
        RenderStrengthsList --> RenderSkillGaps: Missing prerequisite badges
        RenderSkillGaps --> RenderCoverLetter: Editable cover letter starter
    }

    DisplayingAIResults --> Closed: User closes modal
```
