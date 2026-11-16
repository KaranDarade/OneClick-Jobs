# HLD-05: Overall Data Flow Architecture

## 1. Purpose & Scope
This document details the end-to-end data lifecycle across the **OneClick Jobs** platform. It traces three fundamental operational workflows:
1. **The Ingestion & Aggregation Pipeline** (Harvesting, filtering, normalizing, and storing job listings).
2. **The Resume & Candidate Matching Pipeline** (Privacy-first text extraction, skill tagging, and client-side scoring).
3. **The Search & Query Resolution Flow** (Keyword tokenization, location expansion, facet filtering, and pagination).

---

## 2. Mermaid Diagram: End-to-End System Data Flow

```mermaid
flowchart TD
    subgraph Flow1["Pipeline 1: Job Ingestion & Normalization"]
        direction TB
        CRON["Cron Trigger / Manual Sync Trigger<br/>POST /api/sync"] --> SYNC_EXEC["JobSyncService.syncAllSources()"]
        
        SYNC_EXEC --> FETCH_PAR["Parallel Provider Fetch<br/>• Greenhouse: boards-api.greenhouse.io<br/>• Lever: api.lever.co/v0<br/>• Ashby: api.ashbyhq.com<br/>• RemoteOK: remoteok.com/api"]
        
        FETCH_PAR --> RAW_ITEMS["Raw Provider Payload (Any / JSON)"]
        
        RAW_ITEMS --> GATE_SOFTWARE["Software-Only Filtering Gate<br/>• Retain Frontend, Backend, Full Stack, AI/ML, DevOps<br/>• Drop Sales, HR, Legal, Ops, Healthcare"]
        
        GATE_SOFTWARE --> NORM_JOB["Normalization Engine<br/>• Tech Discipline (9 categories)<br/>• Seniority Tier (intern, fresher, mid, senior, lead)<br/>• Work Mode (remote, hybrid, on-site)<br/>• Indian City Canonicalization (Bengaluru, etc.)"]
        
        NORM_JOB --> DEDUP["Deduplication Engine<br/>• Key: slug(company):slug(title):slug(city)<br/>• ATS Priority: Greenhouse/Lever/Ashby > RemoteOK"]
        
        DEDUP --> REPO_SAVE["IJobRepository.upsertJobs()<br/>• Supabase (PostgreSQL) OR InMemoryJobRepository"]
        REPO_SAVE --> CACHE_INVALIDATE["Clear / Refresh MemoryCache<br/>• TTL: 5 minutes"]
    end

    subgraph Flow2["Pipeline 2: Privacy-First Resume & Matching"]
        direction TB
        USER_PDF["Candidate Uploads PDF Resume<br/>[File size < 5MB]"] --> CLIENT_FORM["Multipart/Form-Data Upload<br/>POST /api/resume/parse"]
        
        CLIENT_FORM --> SERVER_MEM["Server In-Memory Buffer<br/>[Zero Disk I/O / Zero DB Write]"]
        
        SERVER_MEM --> UNPDF["unpdf Stream Extractor<br/>• Extract Raw Text Lines"]
        
        UNPDF --> SKILL_EXTRACT["Skill Taxonomy Extractor<br/>• 200+ canonical tech keywords<br/>• Experience years / Fresher inference<br/>• Project title / tech stack extraction"]
        
        SKILL_EXTRACT --> CANDIDATE_JSON["CandidateProfile JSON<br/>{ skills, experienceYears, targetRole, projects }"]
        
        CANDIDATE_JSON --> SESSION_STORE["Client sessionStorage<br/>'oneclick_candidate_profile_v1'"]
        
        SESSION_STORE --> CLIENT_SCORER["Client-Side Scoring Loop<br/>[src/server/matching/scoring.ts]<br/>• Skill Overlap (60% weight)<br/>• Seniority Alignment (25% weight)<br/>• Location/Arrangement (15% weight)"]
        
        CLIENT_SCORER --> MATCH_BADGES["Render Dynamic Match Scores (0-100%)<br/>• 'Strong Match', 'Good Match', 'Skill Gap'"]
    end

    subgraph Flow3["Pipeline 3: Search, Filter & AI Assistant"]
        direction TB
        SEARCH_REQ["Client Search Request<br/>GET /api/jobs?query=react&experience=fresher&location=Bengaluru"] --> CACHE_CHECK{"MemoryCache Hit?"}
        
        CACHE_CHECK -- Yes --> CACHED_RES["Return Cached JobListings"]
        CACHE_CHECK -- No --> QUERY_EXEC["Execute Repository Query<br/>• Tokenized text search<br/>• Multi-facet filter evaluation<br/>• Sort by freshness / relevance"]
        
        QUERY_EXEC --> CACHE_SET["Store in MemoryCache (5 min TTL)"]
        CACHE_SET --> CLIENT_RENDER["Render Job Grid on Client"]

        CLIENT_RENDER --> MODAL_OPEN["User Views Job Details & AI Assistant"]
        
        MODAL_OPEN --> AI_REQ["POST /api/jobs/[id]/ai-analysis<br/>{ candidateProfile, jobDetails }"]
        
        AI_REQ --> AI_RESOLVE{"GEMINI_API_KEY Set?"}
        AI_RESOLVE -- Yes --> GEMINI_CALL["Call Google Gemini 2.0 Flash<br/>• Fit Analysis & Cover Letter Starter"]
        AI_RESOLVE -- No --> DETERMINISTIC["Call DeterministicFallbackProvider<br/>• Rule-based skill gap & draft"]
        
        GEMINI_CALL --> AI_RESP["Return AIAnalysisResponse JSON"]
        DETERMINISTIC --> AI_RESP
        AI_RESP --> AI_DRAWER["Render AI Insights in JobDetailModal"]
    end
```

---

## 3. Detailed Data Transformations

### 3.1 Job Ingestion Pipeline
1. **Raw Payload Ingestion**: Heterogeneous JSON structures from Greenhouse, Lever, Ashby, and RemoteOK arrive asynchronously.
2. **Software Discipline Gating**: Jobs without engineering keywords in titles or descriptions are immediately discarded.
3. **Discipline & Seniority Normalization**:
   - Title containing `"React"`, `"Frontend"`, `"CSS"` $\rightarrow$ `Frontend`.
   - Title containing `"Fresher"`, `"Graduate"`, `"Junior"`, `"Entry Level"`, or $0-1$ years exp $\rightarrow$ `fresher`.
   - Work arrangements: `"Remote"`, `"Work from Home"` $\rightarrow$ `remote`; `"Hybrid"` $\rightarrow$ `hybrid`; others $\rightarrow$ `on-site`.
   - Locations: `"Blr"`, `"Bangalore"`, `"Bengaluru"` $\rightarrow$ `Bengaluru`.
4. **Deduplication Matrix**: Jobs sharing identical company, canonical title, and canonical city are merged, preserving the authoritative ATS application URL.

### 3.2 Resume Extraction Pipeline
1. **Zero-Persistence Upload**: The binary PDF is sent as `multipart/form-data` to `/api/resume/parse`.
2. **Buffer Extraction**: Read into Node.js buffer via `unpdf`.
3. **Taxonomy Matching**: Matched against 200+ canonical developer competencies (e.g. `React`, `TypeScript`, `Node.js`, `Docker`, `PostgreSQL`, `Tailwind CSS`, `Python`).
4. **Seniority Inference**:
   - Detects graduation keywords (e.g., "Batch 2024", "Expected 2025", "B.Tech Fresher", "College Student") $\rightarrow$ Marks as `fresher` (0 years experience).
   - Detects employment date ranges (e.g., "Jan 2021 - Present") $\rightarrow$ Calculates total career months.
5. **Client Caching**: Stored in `sessionStorage` under `oneclick_candidate_profile_v1`. Raw PDF is wiped from memory.

### 3.3 Scoring & AI Workflow
1. **Client-Side Scoring Loop**: Calculates compatibility $S \in [0, 100]$ using weighted harmonic averages:
   $$S = W_{\text{skill}} \cdot \text{SkillScore} + W_{\text{exp}} \cdot \text{ExpScore} + W_{\text{loc}} \cdot \text{LocScore}$$
   If a candidate is a fresher applying for a `lead` or `senior` role, a seniority penalty reduces the score to prevent misleading match ratings.
2. **AI Career Assistant**: When the user requests an AI analysis, the client sends the job ID and candidate profile. The server generates a customized fit explanation, highlighted strengths, missing prerequisites, and an interview starter pitch.
