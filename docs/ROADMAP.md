# OneClick Jobs — Roadmap

> **Less Searching. More Getting Hired.**

---

## Current Status

| Milestone | Status | Date |
|---|---|---|
| Phase 0 — Plan & Architecture | ✅ Complete | 2026-10-13 |
| Phase 1 — Frontend Foundation | ✅ Complete | 2026-10-13 |
| Phase 2 — Search Engine | ✅ Complete | 2026-10-13 |
| Phase 3 — Jobvetta Integration | ✅ Complete | 2026-10-13 |
| Phase 4 — Additional Providers | ✅ Complete | 2026-10-27 |
| Phase 5 — Resume & Matching | ✅ Complete | 2026-10-27 |
| Phase 6 — Database & Persistence | 🟡 Next up | — |
| Phase 7 — Production Readiness | ⬜ Not started | — |
| Phase 8 — Optional AI Features | ⬜ Not started | — |

## Last Completed Milestone

**Phase 5 — Resume Parsing & Deterministic Match Scoring** (2026-10-27)

- Integrated in-memory, zero-retention PDF text extraction (`src/server/resume/parser.ts`) using `unpdf` with binary signature verification (%PDF-), 5MB size bounds, and corrupt/encrypted PDF handling.
- Deterministic technical skill extraction (`src/server/resume/skills.ts`) utilizing the Phase 2 canonical taxonomy with boundary-safe token matching (Java != JavaScript, React != React Native, SQL != PostgreSQL).
- Structured, transparent 0–100 compatibility scoring formula (`src/server/matching/scoring.ts`) with weighted components: Required skills (50%), Preferred skills (20%), Experience alignment (20%), Work arrangement (10%), and proportional weight redistribution for unspecified criteria.
- Candidate profile state management (`src/features/matching/useCandidateProfile.tsx`) stored only in transient browser session storage, allowing candidates to review and remove false positives.
- Match breakdown UI integrated into `/jobs`, `/jobs/[id]`, and `/upload-resume`.
- Expanded test suite from 57 to 76 passing tests (`tests/unit/resume-parser.test.ts`, `tests/unit/resume-skills.test.ts`, `tests/unit/matching-scoring.test.ts`).

## Next Recommended Action

**Start Phase 6 — Database & Persistence (Supabase PostgreSQL)**:
1. Set up Supabase PostgreSQL project schema (`jobs`, `job_sources`, `sync_runs`).
2. Implement periodic background sync jobs to save listings locally and reduce external API latency.
3. Add optional saved-jobs cloud synchronization across devices.

## Phase Details

### Phase 1 — Frontend Foundation
Build responsive UI with demo fixture data. All pages, filters, and controls working.
- Landing page with brand identity
- Job search with filters, sorting, pagination
- Job detail page
- Saved jobs page
- Mobile responsive
- TypeScript strict, ESLint, production build passing
- **No external dependencies** — runs with `npm run dev`

### Phase 2 — Search Engine
Server-side search logic: normalization, location aliases, filtering, sorting, deduplication.
- City alias mapping (Bengaluru/Bangalore, Gurugram/Gurgaon, etc.)
- Delhi NCR grouping
- Work arrangement classification
- Skill normalization
- Comprehensive unit tests

### Phase 3 — First Live Provider (Jobvetta)
Integrate Jobvetta API with real job data.
- **Requires**: Jobvetta API key (sign up at jobvetta.com/dashboard)
- API client with error handling and rate limit tracking
- Response transformation to canonical schema
- Caching (15-30 min TTL)
- Quota monitoring
- Demo mode preserved as fallback

### Phase 4 — Additional Providers
Add RoleDawn with pre-configured India-focused company slugs.
- **Requires**: Nothing (no API key needed)
- Pre-configured company list (e.g., Razorpay, Freshworks, Zerodha, etc.)
- Location-based filtering for India offices
- Provider failure isolation

### Phase 5 — Resume Analysis & Matching
PDF upload, text extraction, editable profiles, deterministic matching.
- PDF text extraction (pdf-parse)
- Skill extraction from resume text
- Configurable scoring formula (0-100)
- Score breakdown with explanations
- Missing skills identification
- Eligibility warnings

### Phase 6 — Database & Persistence
Supabase PostgreSQL for persistent job records.
- **Requires**: Supabase account (free tier)
- SQL migrations for jobs, job_sources, source_sync_runs
- Job storage and deduplication
- Source sync tracking
- Optional saved-job persistence

### Phase 7 — Production Readiness
Security, accessibility, testing, deployment.
- **Requires**: Vercel account (hobby tier)
- Security headers
- Accessibility audit
- Playwright e2e tests
- Deployment pipeline
- Documentation

### Phase 8 — Optional AI Features
Evaluate AI-powered resume analysis and match explanations.
- **Requires**: Google AI (Gemini) API key (free tier)
- Provider-agnostic AI interface
- Resume analysis enhancement
- Match explanations
- Cover letter generation (future)
