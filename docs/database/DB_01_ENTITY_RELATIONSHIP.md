# DB-01: Entity Relationship Diagram (ERD)

## 1. Purpose & Scope
This document specifies the exact PostgreSQL Entity Relationship Diagram for **OneClick Jobs** based on the canonical SQL migration: [supabase/migrations/20261027_init.sql](file:///c:/Users/KARAN/Desktop/Web%20Development/Anti%20Gravity/Jobs%20Curator/oneclick-jobs/supabase/migrations/20261027_init.sql).

No theoretical or unmigrated entities are included.

---

## 2. Mermaid Diagram: Database Entity Relationship

```mermaid
erDiagram
    job_sources ||--o{ source_sync_runs : "records sync history (1:N)"
    jobs ||--o{ saved_jobs : "bookmarked by users (1:N)"

    job_sources {
        TEXT id PK "e.g. 'greenhouse', 'lever', 'demo'"
        TEXT name "Display name of source"
        TEXT type "e.g. 'ats_greenhouse', 'aggregator_jobvetta'"
        TEXT base_url "Base URL endpoint (nullable)"
        BOOLEAN is_active "Whether source is polled during sync"
        TIMESTAMPTZ last_synced_at "Timestamp of last sync attempt"
        JSONB metadata "Provider-specific parameters"
        TIMESTAMPTZ created_at "Record creation timestamp"
        TIMESTAMPTZ updated_at "Record update timestamp"
    }

    jobs {
        TEXT id PK "Unique job slug/hash"
        TEXT title "Job posting title"
        TEXT company "Hiring organization name"
        TEXT company_slug "URL-friendly company slug"
        TEXT location_raw "Raw unparsed location string"
        TEXT city "Normalized city (e.g. Bengaluru, Pune)"
        TEXT state "State or province"
        TEXT country "Default: 'India'"
        BOOLEAN is_remote "Flag for full remote work"
        TEXT work_arrangement "On-site, Remote, Hybrid"
        INTEGER experience_min "Minimum years required"
        INTEGER experience_max "Maximum years required"
        NUMERIC salary_min "Salary lower bound"
        NUMERIC salary_max "Salary upper bound"
        TEXT salary_currency "Default: 'INR'"
        TEXT description_html "Sanitized HTML content"
        TEXT description_text "Plain text description"
        TEXT url "Direct application link"
        TEXT source "Source tag"
        TEXT provider "Provider identifier (greenhouse, etc.)"
        TIMESTAMPTZ posted_at "Original posting date"
        TEXT_ARRAY extracted_skills "Array of parsed skills"
        BOOLEAN is_active "Active vacancy flag"
        TIMESTAMPTZ created_at "Record ingestion timestamp"
        TIMESTAMPTZ updated_at "Record update timestamp"
    }

    source_sync_runs {
        TEXT id PK "uuid_generate_v4()::text"
        TEXT source_id FK "References job_sources(id) ON DELETE CASCADE"
        TEXT status "Sync status: success, partial, failed"
        INTEGER jobs_found "Total jobs harvested"
        INTEGER jobs_inserted "New jobs persisted"
        INTEGER jobs_updated "Existing jobs refreshed"
        TEXT error_message "Diagnostic failure log (nullable)"
        INTEGER duration_ms "Execution time in milliseconds"
        TIMESTAMPTZ created_at "Sync completion timestamp"
    }

    saved_jobs {
        TEXT id PK "uuid_generate_v4()::text"
        TEXT user_id "User identifier / Session UUID"
        TEXT job_id FK "References jobs(id) ON DELETE CASCADE"
        TEXT notes "User personal notes (nullable)"
        TIMESTAMPTZ saved_at "Bookmark creation timestamp"
    }
```

---

## 3. Relational Cardinalities & Constraints

### 3.1 `job_sources` to `source_sync_runs`
- **Cardinality**: One-to-Many ($1 : N$).
- **Foreign Key**: `source_sync_runs.source_id` $\rightarrow$ `job_sources.id`.
- **Referential Action**: `ON DELETE CASCADE`. If a source is deleted from the catalog, its historical audit runs are pruned automatically.

### 3.2 `jobs` to `saved_jobs`
- **Cardinality**: One-to-Many ($1 : N$).
- **Foreign Key**: `saved_jobs.job_id` $\rightarrow$ `jobs.id`.
- **Referential Action**: `ON DELETE CASCADE`. If an expired job is purged from `jobs`, associated user bookmarks are removed to prevent orphan references.
- **Unique Constraint**: `CONSTRAINT unique_user_saved_job UNIQUE(user_id, job_id)`. Prevents duplicate bookmarks for the same job by the same user.

### 3.3 Architectural Note on `jobs.provider`
`jobs.provider` and `jobs.source` are stored as indexable `TEXT` columns rather than formal foreign keys to `job_sources.id`. This deliberate architectural choice allows ingestion pipelines to ingest valid jobs from ad-hoc or dynamic providers without failing foreign key constraints if the catalog record has not yet been seeded.

---

## 4. Verification Reference
- Migration Source: [supabase/migrations/20261027_init.sql](file:///c:/Users/KARAN/Desktop/Web%20Development/Anti%20Gravity/Jobs%20Curator/oneclick-jobs/supabase/migrations/20261027_init.sql#L1-L92)
