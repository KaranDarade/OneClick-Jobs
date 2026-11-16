# LLD-02: API Architecture & Endpoint Specification

## 1. Purpose & Scope
This document specifies the complete REST API surface implemented in **OneClick Jobs** under Next.js App Router (`src/app/api/`). It provides request/response schemas, status codes, query parameters, authentication, and client component linkages.

---

## 2. API Endpoint Inventory Matrix

| Endpoint Route | HTTP Method | Authentication | Caching Policy | Handling File |
|---|---|---|---|---|
| `/api/health` | `GET` | Public | No-store | `src/app/api/health/route.ts` |
| `/api/jobs` | `GET` | Public | 10m In-Memory Cache | `src/app/api/jobs/route.ts` |
| `/api/jobs/[id]` | `GET` | Public | Provider-cached | `src/app/api/jobs/[id]/route.ts` |
| `/api/jobs/[id]/ai-analysis` | `POST` | Public | No-store (On-demand) | `src/app/api/jobs/[id]/ai-analysis/route.ts` |
| `/api/resume/parse` | `POST` | Public | No-store (Ephemeral) | `src/app/api/resume/parse/route.ts` |
| `/api/sync` | `POST` | Public / Admin | No-store | `src/app/api/sync/route.ts` |

---

## 3. Detailed Route Specifications

### 3.1 `GET /api/health`
**Purpose**: System liveness, readiness probe, service availability status, and memory diagnostics.

- **Request Query Params**: None.
- **Response Schema (200 OK)**:
```json
{
  "status": "ok",
  "timestamp": "2026-11-16T10:00:00.000Z",
  "uptimeSeconds": 1420,
  "environment": "production",
  "responseTimeMs": 4,
  "memory": {
    "rssMb": 112,
    "heapUsedMb": 64,
    "heapTotalMb": 98
  },
  "services": {
    "repository": { "status": "up", "type": "InMemoryJobRepository" },
    "greenhouse": { "status": "live", "mode": "public_boards" },
    "lever": { "status": "live", "mode": "public_postings" },
    "ashby": { "status": "live", "mode": "public_boards" },
    "remoteok": { "status": "live", "mode": "public_feed" },
    "jobvetta": { "status": "demo_fallback", "apiKeyConfigured": false }
  }
}
```

---

### 3.2 `GET /api/jobs`
**Purpose**: Multi-source aggregated software job search, filtering, and sorting.

- **Query Parameters**:
  - `q` (string): Keyword search (e.g. `"react"`, `"python"`, `"golang"`).
  - `location` (string): Geographic filter (e.g. `"Bengaluru"`, `"Remote"`, `"All India"`).
  - `arrangement` (string[]): Work arrangements (`remote`, `hybrid`, `on-site`).
  - `experience` (string[]): Experience levels (`internship`, `fresher`, `mid`, `senior`, `lead`).
  - `discipline` (string[]): Tech disciplines (`Frontend`, `Backend`, `Full Stack`, `Mobile`, `DevOps & Cloud`, `Data & AI`, `QA & Testing`, `Product & Design`).
  - `sort` (string): Sort order (`"relevance"`, `"date"`, `"salary"`).
  - `refresh` (boolean): Set `"true"` to bypass server cache and force live aggregator fetch.
  - `limit` (number): Pagination ceiling (default: `50`).

- **Response Schema (200 OK)**:
```json
{
  "jobs": [
    {
      "id": "greenhouse:stripe-482910",
      "providerId": "greenhouse",
      "externalId": "stripe-482910",
      "title": "Software Engineer, Frontend",
      "company": "Stripe",
      "normalizedCity": "Bengaluru",
      "workArrangement": "hybrid",
      "experienceLevel": "mid",
      "requiredSkills": ["React", "TypeScript", "GraphQL"],
      "originalUrl": "https://boards.greenhouse.io/stripe/jobs/482910",
      "postedAt": "2026-11-15T08:30:00Z"
    }
  ],
  "total": 42,
  "sources": ["greenhouse", "lever", "ashby", "remoteok"],
  "cached": true
}
```

---

### 3.3 `GET /api/jobs/[id]`
**Purpose**: Resolves full job description and metadata for a specific job vacancy by its composite ID prefix.

- **Route Parameter**:
  - `id`: Composite identifier prefixed with provider (e.g., `greenhouse:stripe-482910`, `lever:meesho-9812`, `demo:demo-1`).
- **Response**: Full `Job` object or `404 Not Found` if delisted.

---

### 3.4 `POST /api/jobs/[id]/ai-analysis`
**Purpose**: Invokes Gemini 2.0 Flash (or Deterministic Fallback) to generate personalized match rationales and cover letters.

- **Request Body (JSON)**:
```json
{
  "candidate": {
    "skills": ["React", "JavaScript", "Tailwind CSS"],
    "experienceYears": 1,
    "targetRole": "Frontend Developer",
    "preferredArrangement": "remote"
  },
  "breakdown": {
    "overallScore": 88,
    "matchingRequiredSkills": ["React", "JavaScript"],
    "missingRequiredSkills": ["TypeScript", "GraphQL"]
  }
}
```

- **Response Schema (200 OK)**:
```json
{
  "fitSummary": "Strong match (88%) for Software Engineer, Frontend at Stripe...",
  "strengths": ["Direct alignment on core stack: React, JavaScript", "Remote work preferences align"],
  "growthAreas": ["Familiarize yourself with TypeScript and GraphQL before interviews"],
  "interviewTips": ["Review state management lifecycles and modern SSR patterns"],
  "coverLetterStarter": "Dear Hiring Team at Stripe, with my proven experience in building responsive web applications using React..."
}
```

---

### 3.5 `POST /api/resume/parse`
**Purpose**: Parses candidate resume PDF in RAM via `unpdf` and returns structured profile.

- **Request Headers**: `Content-Type: multipart/form-data`
- **Request Form Field**: `resume` (PDF Binary, max 5MB)
- **Response Schema (200 OK)**:
```json
{
  "success": true,
  "profile": {
    "extractedTextSnippet": "...",
    "detectedSkills": [
      { "name": "React", "category": "frontend", "confidence": 0.95 },
      { "name": "Node.js", "category": "backend", "confidence": 0.90 }
    ],
    "experienceYears": 0,
    "isFresher": true,
    "targetRole": "Full Stack Developer",
    "projects": [
      { "title": "E-Commerce Microservices", "techStack": ["Next.js", "Docker"] }
    ]
  }
}
```

---

### 3.6 `POST /api/sync`
**Purpose**: Triggers the `JobSyncService` orchestrator to poll active ATS boards and update the database/in-memory repository.

- **Response Schema (200 OK)**:
```json
{
  "success": true,
  "timestamp": "2026-11-16T10:05:00.000Z",
  "results": {
    "greenhouse": { "jobsFound": 35, "jobsInserted": 12, "jobsUpdated": 23, "durationMs": 420 },
    "lever": { "jobsFound": 28, "jobsInserted": 5, "jobsUpdated": 23, "durationMs": 310 },
    "ashby": { "jobsFound": 18, "jobsInserted": 2, "jobsUpdated": 16, "durationMs": 280 },
    "remoteok": { "jobsFound": 40, "jobsInserted": 15, "jobsUpdated": 25, "durationMs": 510 }
  }
}
```
