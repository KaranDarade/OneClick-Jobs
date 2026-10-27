-- OneClick Jobs — Phase 6 Database Migration: Supabase PostgreSQL Initial Schema
-- Tables: jobs, job_sources, source_sync_runs, saved_jobs

-- 1. Enable UUID and pgcrypto extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Job Sources Catalog
CREATE TABLE IF NOT EXISTS job_sources (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- e.g. 'ats_greenhouse', 'aggregator_jobvetta', 'demo'
    base_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_synced_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial known providers
INSERT INTO job_sources (id, name, type, base_url, is_active)
VALUES 
    ('greenhouse', 'Greenhouse ATS', 'ats_greenhouse', 'https://boards-api.greenhouse.io/v1/boards', true),
    ('jobvetta', 'Jobvetta API', 'aggregator_jobvetta', 'https://api.jobvetta.com/v1', true),
    ('demo', 'Demo Fixtures', 'demo', NULL, true)
ON CONFLICT (id) DO NOTHING;

-- 3. Canonical Normalized Jobs Table
CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    company_slug TEXT,
    location_raw TEXT,
    city TEXT,
    state TEXT,
    country TEXT NOT NULL DEFAULT 'India',
    is_remote BOOLEAN NOT NULL DEFAULT false,
    work_arrangement TEXT NOT NULL DEFAULT 'On-site', -- 'On-site', 'Remote', 'Hybrid'
    experience_min INTEGER,
    experience_max INTEGER,
    salary_min NUMERIC,
    salary_max NUMERIC,
    salary_currency TEXT DEFAULT 'INR',
    description_html TEXT,
    description_text TEXT,
    url TEXT NOT NULL,
    source TEXT NOT NULL,
    provider TEXT NOT NULL,
    posted_at TIMESTAMPTZ,
    extracted_skills TEXT[] DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for ultra-fast query performance
CREATE INDEX IF NOT EXISTS idx_jobs_provider ON jobs(provider);
CREATE INDEX IF NOT EXISTS idx_jobs_city ON jobs(city);
CREATE INDEX IF NOT EXISTS idx_jobs_work_arrangement ON jobs(work_arrangement);
CREATE INDEX IF NOT EXISTS idx_jobs_is_remote ON jobs(is_remote);
CREATE INDEX IF NOT EXISTS idx_jobs_posted_at ON jobs(posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_skills ON jobs USING GIN(extracted_skills);
CREATE INDEX IF NOT EXISTS idx_jobs_search ON jobs USING GIN(to_tsvector('english', title || ' ' || company || ' ' || coalesce(description_text, '')));

-- 4. Source Sync Runs Audit Table
CREATE TABLE IF NOT EXISTS source_sync_runs (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    source_id TEXT NOT NULL REFERENCES job_sources(id) ON DELETE CASCADE,
    status TEXT NOT NULL, -- 'success', 'partial', 'failed'
    jobs_found INTEGER NOT NULL DEFAULT 0,
    jobs_inserted INTEGER NOT NULL DEFAULT 0,
    jobs_updated INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    duration_ms INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_source_sync_runs_source_id ON source_sync_runs(source_id);
CREATE INDEX IF NOT EXISTS idx_source_sync_runs_created_at ON source_sync_runs(created_at DESC);

-- 5. Saved Jobs Table (Optional Cloud Sync)
CREATE TABLE IF NOT EXISTS saved_jobs (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id TEXT NOT NULL,
    job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    notes TEXT,
    saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_saved_job UNIQUE(user_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_jobs_user_id ON saved_jobs(user_id);
