# OneClick Jobs

> **Less Searching. More Getting Hired.**  
> India-focused modern job discovery and matching platform with zero spam, live ATS integration, instant resume compatibility scoring, and AI-powered career insights.

---

## ✨ Features

- **Live Multi-Source Aggregation**: Direct keyless integration with Greenhouse ATS public boards across top tech employers with India engineering centers (Stripe, MongoDB, Databricks, InMobi, Rubrik, Okta, Elastic, Twilio, Coinbase) alongside Jobvetta and curated demo fixtures.
- **Privacy-First In-Memory Resume Parsing**: Zero-retention text extraction from PDF resumes using `unpdf`. Files are processed in transient server memory and immediately discarded — never saved to disk or third-party servers.
- **Deterministic Match Scoring (0–100)**: Rule-based compatibility algorithm (`v1.0.0-rule-based`) evaluating Required Skills (50%), Preferred Skills (20%), Experience Alignment (20%), and Work Arrangement (10%) with transparent scoring breakdowns.
- **AI Career Assistant**: Google Gemini-powered candidate fit summaries, personalized strength/growth area recommendations, interview talking points, and tailored 1-click copyable cover letter starters (with instant deterministic offline fallback).
- **Dual-Mode Persistence Layer**: Production-ready Supabase PostgreSQL schema with automatic, zero-crash fallback to high-performance in-memory caching during local development.
- **Production Ready & Resilient**: Hardened security headers, system health monitoring (`/api/health`), dynamic XML sitemaps, robots.txt, and branded error boundaries.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16.4.3](https://nextjs.org) (App Router, Turbopack, Partial Prerendering)
- **UI Library**: [React 19](https://react.dev)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com)
- **Icons**: [Lucide React](https://lucide.dev)
- **Validation**: [Zod](https://zod.dev)
- **Resume Processing**: [unpdf](https://github.com/unjs/unpdf)
- **Testing**: [Vitest](https://vitest.dev) (85/85 tests passing)
- **Language**: TypeScript Strict Mode

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+ installed
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/KaranDarade/OneClick-Jobs.git
cd OneClick-Jobs

# Install dependencies
npm install --legacy-peer-deps

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

---

## 🧪 Testing & Verification

Run the comprehensive unit and integration test suite:

```bash
# Execute unit tests
npm test

# Run TypeScript typecheck
npx tsc --noEmit

# Test production build
npm run build
```

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env.local` to configure optional integrations. All integrations are optional — OneClick Jobs works out of the box with zero external API keys!

```bash
# Application Base URL
NEXT_PUBLIC_APP_URL=https://oneclickjobs.in

# Optional: Jobvetta Provider API Key (50 requests/day)
JOBVETTA_API_KEY=

# Optional: Supabase PostgreSQL Persistence
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Optional: Google Gemini AI Assistant
GEMINI_API_KEY=
```

---

## ☁️ Deploying to Vercel

1. Import this repository into [Vercel](https://vercel.com).
2. Vercel automatically detects Next.js and configuration settings from `vercel.json`.
3. Add any optional environment variables in Project Settings > Environment Variables.
4. Click **Deploy**.

---

## 📄 License

MIT License. Designed and built with ❤️ for Indian tech job seekers.
