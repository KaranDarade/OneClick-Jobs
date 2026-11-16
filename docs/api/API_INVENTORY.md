# API-00: Complete API Inventory & Route Catalog

## 1. Overview
This catalog details all HTTP API routes hosted under Next.js App Router in **OneClick Jobs** (`src/app/api/`).

---

## 2. API Route Summary

```mermaid
flowchart LR
    CLIENT["Client Application"]
    
    subgraph APIRoutes["Next.js App Router API Routes"]
        R_HEALTH["GET /api/health<br/>Health & System Metrics"]
        R_JOBS["GET /api/jobs<br/>Aggregated Job Search & Filter"]
        R_JOB_ID["GET /api/jobs/[id]<br/>Job Detail Resolution"]
        R_AI["POST /api/jobs/[id]/ai-analysis<br/>Gemini / Rule Fit Breakdown"]
        R_RESUME["POST /api/resume/parse<br/>In-Memory PDF Resume Parser"]
        R_SYNC["POST /api/sync<br/>Provider Sync Orchestrator"]
    end

    CLIENT --> R_HEALTH
    CLIENT --> R_JOBS
    CLIENT --> R_JOB_ID
    CLIENT --> R_AI
    CLIENT --> R_RESUME
    CLIENT --> R_SYNC
```

---

## 3. Route Specification Table

| Route Path | Method | Auth Required | Cache Strategy | Upstream Dependencies | Primary Purpose |
|---|---|---|---|---|---|
| `/api/health` | `GET` | No | `no-store` | Node.js Process, Repository | Health monitoring, memory stats, provider status |
| `/api/jobs` | `GET` | No | 10 min RAM Cache | Greenhouse, Lever, Ashby, RemoteOK | Search, filter, and retrieve software jobs |
| `/api/jobs/[id]` | `GET` | No | Upstream Cache | Specific ATS Client | Resolves complete job description & metadata |
| `/api/jobs/[id]/ai-analysis` | `POST` | No | `no-store` | Google Gemini 2.0 Flash / Local Rules | Generates fit summary, skill gaps & cover letter |
| `/api/resume/parse` | `POST` | No | `no-store` | `unpdf`, Skill Dictionary | In-memory text extraction, skill & fresher detection |
| `/api/sync` | `POST` | No / Admin | `no-store` | `JobSyncService`, All Providers | Ingests new postings from ATS boards into repo |
