# OneClick Jobs — Search, Normalization & Deduplication Architecture

> **Less Searching. More Getting Hired.**

This document specifies the canonical normalization, location aliasing, skill taxonomy, and deduplication engine implemented in **Phase 2**.

---

## 1. Canonical Job Normalization (`src/server/jobs/normalize.ts`)

### 1.1 Ingestion Schema & Zod Validation
External payloads (or future ATS API responses) are ingested through `RawJobInputSchema`:
- Mandatory fields: `providerId`, `externalId`, `title`, `company`, `originalUrl` (must be a valid URL).
- Gracefully accepts alternative property names (e.g. `location` as an alias for `originalLocation`, `experienceYearsMin`/`Max`).
- Generates structured, descriptive error arrays on failure rather than crashing or throwing unhandled exceptions.

### 1.2 Work Arrangement Mapping
Raw text is parsed into one of four canonical states:
- `remote`: matches `"remote"`, `"wfh"`, `"work from home"`, `"telecommute"`.
- `hybrid`: matches `"hybrid"`, `"flexible hybrid"`, `"partially remote"`.
- `on-site`: matches `"on-site"`, `"onsite"`, `"office"`, `"work from office"`, `"in-person"`.
- `unknown`: assigned when information is missing, ambiguous, or contradictory.

### 1.3 Experience Level Mapping
Normalized into seven categories:
`internship` | `fresher` | `junior` | `mid` | `senior` | `lead` | `unknown`
- Inspects semantic keywords (`"intern"`, `"entry"`, `"trainee"`, `"graduate"`, `"associate"`, `"senior"`, `"lead"`, `"architect"`).
- Uses numeric min/max year thresholds as fallback indicators (`0-1` -> fresher, `1-3` -> junior, `3-5` -> mid, `5-8` -> senior, `8+` -> lead).

### 1.4 Salary & Compensation
- Validates that numeric bounds are non-negative.
- Automatically corrects inverted ranges (`salaryMin > salaryMax`).
- Preserves currency and payment frequency (`yearly` / `monthly` / `hourly`).

---

## 2. Indian Location & City Normalization (`src/server/jobs/locations.ts`)

### 2.1 Supported Tech Hubs & Aliases
The normalization dictionary resolves 21+ Indian tech hubs, including historical/colonial spellings:
- **Bengaluru**: `bengaluru`, `bangalore`, `blr`, `banglore`
- **Mumbai**: `mumbai`, `bombay`, `navi mumbai`, `thane`
- **Pune**: `pune`, `poona`, `pcmc`, `hinjawadi`, `hinjewadi`
- **Hyderabad**: `hyderabad`, `secunderabad`, `cyberabad`, `hitec city`
- **Chennai**: `chennai`, `madras`
- **Kolkata**: `kolkata`, `calcutta`
- **Ahmedabad**: `ahmedabad`, `amdavad`
- **Kochi**: `kochi`, `cochin`, `ernakulam`
- **Nashik**: `nashik`, `nasik`
- **Gurugram**: `gurugram`, `gurgaon`
- **Noida** vs **Greater Noida**: Accurately differentiated (longer alias matched first).

### 2.2 Regional Groupings
- **Delhi NCR**: Aggregates `Delhi`, `Noida`, `Greater Noida`, and `Gurugram` under a single search filter without destroying the granular city tag on individual listings.

### 2.3 Remote Work Boundary Flags
- `isIndiaRemote`: Verified explicitly when terms like `"India Remote"`, `"Anywhere in India"`, or `"Pan India"` are present.
- `isWorldwideRemote`: Flagged only when explicitly supported (`"Worldwide Remote"`, `"Global Remote"`).

---

## 3. Technical Skills Taxonomy (`src/server/jobs/skills.ts`)

Standardizes technical abbreviations to canonical display labels while strictly preventing false-positive cross-technology collisions:
- `JS`, `JavaScript`, `ES6` -> `JavaScript`
- `TS` -> `TypeScript`
- `ReactJS`, `react.js` -> `React` (Distinct from `React Native` / `RN`)
- `Java` (Core Java) is strictly preserved as `Java` (Never merged with `JavaScript`)
- `Postgres`, `psql` -> `PostgreSQL` (Distinct from generic `SQL`)
- `K8s` -> `Kubernetes`
- `AWS`, `Amazon Web Services` -> `AWS`
- `GCP` -> `Google Cloud Platform`

---

## 4. Deduplication Engine (`src/server/jobs/deduplicate.ts`)

Applies strict hierarchical deduplication to ensure multiple feeds do not produce duplicate cards:
1. **Provider + External ID**: `${job.providerId}:${job.externalId}`
2. **Canonical Job URL**: Strips tracking parameters (`utm_*`, `ref`, `gh_src`, `lever-source`, `source`), normalizes protocol/host, and removes trailing slashes.
3. **Exact Composite Match**: Strict concatenation of cleaned `${company}::${title}::${normalizedCity}`.
- Avoids over-merging: Different titles at the same company, or identical titles across different cities, are preserved as unique openings.
