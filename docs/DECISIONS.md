# OneClick Jobs — Decision Log

> Track all architectural, technical, and product decisions.

---

## D-001: Start from scratch (2026-10-13)

**Context**: Workspace is empty — no prior code exists.  
**Decision**: Initialize a new Next.js 15 project from scratch.  
**Status**: ✅ Confirmed

## D-002: Primary job source — Jobvetta (2026-10-13)

**Context**: Evaluated Jobvetta, RoleDawn, direct ATS APIs, and major Indian job boards.  
**Decision**: Use Jobvetta as primary source (India-only, structured data, 50 req/day free). RoleDawn as supplementary for company boards. Naukri/Indeed/LinkedIn excluded due to no permitted API access.  
**Status**: ✅ Confirmed  
**Risk**: 50 req/day limits real-time discovery; mitigated by caching + DB storage (Phase 6).

## D-003: No database for MVP Phases 1-5 (2026-10-13)

**Context**: Supabase requires an account and introduces deployment complexity.  
**Decision**: Phases 1-5 work without a database. Jobs come from APIs; saved jobs use localStorage. Database added in Phase 6.  
**Status**: ✅ Confirmed

## D-004: Demo mode as first-class feature (2026-10-13)

**Context**: App must work without API keys for development and demo purposes.  
**Decision**: Ship a "demo" provider with realistic fixture data. Automatically active when no API keys are configured.  
**Status**: ✅ Confirmed

## D-005: Tech stack (2026-10-13)

**Context**: Spec recommends Next.js + TypeScript + Tailwind + shadcn/ui.  
**Decision**: Next.js 15 (App Router), React 19, TypeScript 5.x (strict), Tailwind CSS 4, shadcn/ui, Lucide icons, npm.  
**Status**: 🟡 Awaiting user approval

## D-006: Branding direction (2026-10-13)

**Context**: Need original branding distinct from JevJobs.ai.  
**Decision**: Modern clean palette (deep blue/indigo + accent), Inter/Geist font, "OneClick Jobs" wordmark.  
**Status**: 🟡 Awaiting user approval

## D-007: RoleDawn via wrapper, not direct ATS APIs (2026-10-13)

**Context**: Could call Greenhouse/Lever/Ashby APIs directly or use RoleDawn's unified wrapper. Research confirmed:
- **Greenhouse** (`boards-api.greenhouse.io`): Public, keyless, JSON. No structured country/salary fields. Freeform location strings ("Bengaluru" vs "Bangalore, Karnataka, India").
- **Lever** (`api.lever.co/v0/postings`): Public, keyless, JSON. Optional `country` field (often null), optional `salaryRange`, `workplaceType` for remote detection.
- **Ashby** (`api.ashbyhq.com/posting-api/job-board`): Public, keyless, JSON. Best structured data — `addressCountry`, `compensationTiers` with INR, `isRemote`, `workplaceType`. No single-job endpoint though.
- All three are legally safe to aggregate (public data, no auth required, not behind paywalls).

**Decision**: Use RoleDawn for Phase 4 — it normalizes all three ATS into one schema, handles caching, and is one integration instead of three. Direct ATS integration (especially Ashby for its richer data) reserved for Phase 4+ if volume or data quality requires it.  
**Status**: ✅ Confirmed

## D-008: India location normalization strategy (2026-10-13)

**Context**: Research confirmed that Indian city names are inconsistently entered across all ATS systems (e.g., "Bengaluru" vs "Bangalore", "Gurgaon" vs "Gurugram", "Delhi NCR"). No ATS reliably provides ISO country codes.  
**Decision**: Build a comprehensive city alias dictionary in Phase 2 that normalizes all known Indian city variants. Check location strings, office arrays, `country` field, and description text for India indicators. Never rely solely on a `country` field.  
**Status**: ✅ Confirmed

## D-009: Hierarchical deduplication and canonical normalization (2026-10-13)

**Context**: Aggregating job listings from multiple ATS boards and syndication feeds risks surface duplicates with minor query-string differences or identical cross-posted postings.
**Decision**: Implement a 3-tier deterministic deduplication hierarchy in `src/server/jobs/deduplicate.ts`:
1. Exact provider ID + external ID
2. Canonicalized original URL (tracking and UTM parameter removal)
3. Strict composite match: `${company}::${title}::${normalizedCity}`
Avoid fuzzy cross-city or same-company title merging to prevent false merges of legitimate distinct vacancies. Validate incoming provider feeds using Zod schemas (`src/server/jobs/normalize.ts`).  
**Status**: ✅ Confirmed

## D-010: Jobvetta live provider integration architecture (2026-10-13)

**Context**: Need to connect real India-focused jobs from Jobvetta (`https://api.jobvetta.com/v1`) while strictly adhering to the 50 requests/day quota, max 10 results/request, and maintaining zero breakages when running without an API key or when rate-limited.
**Decision**:
1. Server-side only client (`src/server/providers/jobvetta/client.ts`) utilizing `JOBVETTA_API_KEY` from process environment variables. No client-side key leakage.
2. In-memory generic TTL caching (`src/server/cache.ts`) with 15-minute search TTL and 30-minute detail TTL.
3. Parse and forward upstream `X-RateLimit-*` headers to monitor quota health.
4. Transparent demo fallback: When `JOBVETTA_API_KEY` is undefined, empty, rate-limited (HTTP 429), or encountering network failure, fallback cleanly to canonical demo fixtures with clear visual UI banner tags ("Demo Mode" or "Demo Fallback: Rate Limited / Offline").
5. Strict Zod response schema validation (`JobvettaSearchResponseSchema`, `JobvettaDetailSchema`) ensuring malformed upstream payloads fail safely to fallback instead of breaking page rendering.  
**Status**: ✅ Confirmed

## D-011: Direct ATS integration and multi-provider aggregation (2026-10-27)

**Context**: Relying exclusively on Jobvetta (50 requests/day free tier limit) restricts real-time discovery and inventory. Need massive, verified India tech job volume at ₹0 cost with zero API key dependencies.
**Decision**:
1. Implemented direct, keyless ATS integration via Greenhouse public JSON endpoints (`boards-api.greenhouse.io/v1/boards/{slug}/jobs`).
2. Pre-configured vetted tech employers with major Indian engineering centers (Stripe, MongoDB, Databricks, InMobi, Rubrik, Okta, Elastic, Twilio, Coinbase), unlocking 350+ live India postings immediately.
3. Multi-source parallel aggregation in `/api/jobs` merging Greenhouse boards with Jobvetta.
4. Independent failure isolation using `Promise.allSettled`: failure of one board or provider does not impact others.
5. In-memory 15-minute board cache prevents redundant upstream HTTP calls.
6. Unified through Phase 2 canonical normalization and 3-tier deduplication.  
**Status**: ✅ Confirmed

## D-012: In-memory PDF extraction and deterministic compatibility scoring (2026-10-27)

**Context**: Candidates need to see how well their skills match job postings. Must preserve strict candidate privacy (never persist original PDFs or sell personal data) and avoid AI hallucinations or probabilistic hiring claims.
**Decision**:
1. Adopted `unpdf` for text extraction — lightweight, isomorphic, and fully compatible with modern Node.js and Next.js Turbopack without native canvas/C++ compile issues.
2. Zero persistence: PDF buffers are processed transiently in server memory and discarded immediately. No cloud storage, database writes, or logging of raw resume text or PII.
3. Word boundary skill matching using Phase 2 canonical taxonomy to avoid false merges (Java vs JavaScript, React vs React Native, SQL vs PostgreSQL).
4. Deterministic scoring algorithm `v1.0.0-rule-based`:
   - Required skills (50%), Preferred skills (20%), Experience alignment (20%), Work arrangement (10%).
   - Proportional weight redistribution when listing criteria or experience are unspecified.
   - Strictly labeled as "Rule-based compatibility score (0-100)" with explicit matched and missing skill chips.
5. Candidate profile persisted only in browser `sessionStorage` with full user controls to edit skills and clear profile at any time.  
**Status**: ✅ Confirmed

