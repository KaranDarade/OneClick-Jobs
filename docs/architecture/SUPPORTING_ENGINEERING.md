# Supporting Engineering Diagrams & Specifications

## 1. Purpose & Scope
This document complements the core HLD documents with engineering workflow diagrams covering developer workflows, automated test pipelines, multi-tiered caching strategies, security boundaries, and the end-user navigation journey.

---

## 2. Engineering Architecture Diagrams

### 2.1 Git Branching & Release Workflow
```mermaid
gitGraph
    commit id: "Initial Release"
    branch feature/oneclick-jobs-development
    checkout feature/oneclick-jobs-development
    commit id: "feat: job normalization & filters"
    commit id: "feat: unpdf in-memory resume parsing"
    commit id: "feat: multi-factor matching engine"
    commit id: "fix: fresher & software role gates"
    checkout main
    merge feature/oneclick-jobs-development id: "PR #12: Merge vetted feature branch"
    commit id: "Deploy: Production Release to Vercel"
```

### 2.2 CI/CD Build & Deployment Lifecycle
```mermaid
flowchart LR
    DEV["Developer Push<br/>git push origin main"] --> GITHUB["GitHub Repository<br/>KaranDarade/OneClick-Jobs"]
    
    subgraph CI["Automated CI Verification"]
        GITHUB --> LINT["npm run lint<br/>(ESLint 9 + Next Config)"]
        GITHUB --> TEST["npm run test<br/>(Vitest Suite: Unit & Integration)"]
        GITHUB --> BUILD["npm run build<br/>(Next.js TypeScript Compiler)"]
    end
    
    LINT & TEST & BUILD --> VERCEL_TRIGGER["Vercel Webhook"]
    
    subgraph CD["Vercel Edge Deployment"]
        VERCEL_TRIGGER --> VERCEL_BUILD["Serverless Function Bundling"]
        VERCEL_BUILD --> CDN_PURGE["Global Edge CDN Sync"]
        CDN_PURGE --> PROD_LIVE["Live at Production URL"]
    end
```

### 2.3 Testing Architecture (Vitest)
```mermaid
flowchart TD
    subgraph TestSuite["Test Suite (tests/)"]
        subgraph UnitTests["Unit Tests (tests/unit/)"]
            T_NORM["normalization.test.ts<br/>• Discipline, Seniority, Location mapping"]
            T_DEDUP["deduplication.test.ts<br/>• Hash collisions, ATS preference"]
            T_RESUME["resume-skills.test.ts<br/>• Skill extraction, fresher detection"]
            T_MATCH["matching-scoring.test.ts<br/>• Weight distribution, seniority dampener"]
            T_SEARCH["search.test.ts<br/>• Filter criteria, token evaluation"]
        end

        subgraph IntegrationTests["Integration Tests (tests/integration/)"]
            T_PROV["providers.test.ts<br/>• Greenhouse, Lever, Ashby, RemoteOK mocks"]
            T_SYNC["sync.test.ts<br/>• JobSyncService pipeline execution"]
            T_REPO["repository.test.ts<br/>• InMemory & Supabase operations"]
        end
    end

    VITEST["Vitest Test Runner<br/>[vitest.config.mts]"] --> UnitTests
    VITEST --> IntegrationTests
```

### 2.4 Multi-Tier Cache Architecture
```mermaid
flowchart TD
    REQ["Incoming Job Query Request"] --> L1{"Tier 1: Client Memory / SWR<br/>(Browser Component State)"}
    L1 -- Hit --> RET1["Instant Render (0ms)"]
    L1 -- Miss --> L2{"Tier 2: Server MemoryCache<T><br/>(src/server/db/cache.ts - 5m TTL)"}
    L2 -- Hit --> RET2["Server Cache Hit (<5ms)"]
    L2 -- Miss --> L3{"Tier 3: Repository Query<br/>(Supabase GIN index / InMemory list)"}
    L3 -- Found --> RET3["Repository Result (~50ms)"]
    L3 -- Fallback Needed --> L4["Tier 4: Live ATS Aggregation<br/>(JobSyncService background run)"]
```

### 2.5 Security & Privacy Boundary
```mermaid
flowchart LR
    subgraph PublicBoundary["Public Untrusted Boundary"]
        CLIENT["User Browser"]
        RESUME_PDF["Candidate PDF Resume"]
    end

    subgraph SecureServerless["Secure Next.js Serverless Execution"]
        ROUTE["POST /api/resume/parse"]
        RAM_BUFFER["In-Memory Buffer<br/>(Ephemeral RAM)"]
        UNPDF_ENGINE["unpdf Extractor"]
        EXTRACTOR["Skill & Project Matcher"]
    end

    subgraph ZeroTrustStorage["Persistence Layers"]
        DB[(Supabase PostgreSQL)]
        DISK[("Server Hard Disk")]
    end

    CLIENT -->|Encrypted HTTPS Stream| ROUTE
    RESUME_PDF --> ROUTE
    ROUTE --> RAM_BUFFER
    RAM_BUFFER --> UNPDF_ENGINE
    UNPDF_ENGINE --> EXTRACTOR
    EXTRACTOR -->|Sanitized Profile JSON| CLIENT
    
    RAM_BUFFER -.->|WIPED IMMEDIATELY| DISK
    RAM_BUFFER -.x|BLOCKED: Zero Resume DB Storage| DB
```

### 2.6 End-to-End User Journey
```mermaid
journey
    title Candidate Job Discovery Journey on OneClick Jobs
    section Discovery
      Visit Landing Page: 5: Candidate
      View Curated Tech Jobs: 5: Candidate
      Filter by Fresher / Remote / Bengaluru: 4: Candidate
    section Curation & Matching
      Upload Resume (PDF): 5: Candidate
      Review Detected Skills & Projects: 5: Candidate
      View Dynamic Match Scores on Feed: 5: Candidate
    section Application
      Open Job Detail Modal: 5: Candidate
      Inspect AI Match Breakdown & Cover Letter Starter: 4: Candidate
      Click Direct Apply to Official ATS Portal: 5: Candidate
      Save Job to Bookmarks: 4: Candidate
```

---

## 3. Engineering Best Practices Implemented
1. **Privacy By Architecture**: Resumes are parsed completely in ephemeral serverless RAM. Zero storage buckets, zero local file writes, and zero database entries for candidate CVs.
2. **Zero-Configuration Fallback**: The platform functions seamlessly offline or without API keys, defaulting to static fixtures, `InMemoryJobRepository`, and `DeterministicFallbackProvider`.
3. **Deterministic Match Scoring**: Matching algorithms run client-side in sub-millisecond execution, enabling fluid filtering and instant feedback.
