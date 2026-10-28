import { NextRequest, NextResponse } from "next/server";
import { JobvettaClient } from "@/server/providers/jobvetta/client";
import { GreenhouseClient } from "@/server/providers/greenhouse/client";
import { LeverClient } from "@/server/providers/lever/client";
import { AshbyClient } from "@/server/providers/ashby/client";
import { AdzunaClient } from "@/server/providers/adzuna/client";
import { JoobleClient } from "@/server/providers/jooble/client";
import { ApifyClient } from "@/server/providers/apify/client";
import { filterAndSortJobs } from "@/features/job-search/search";
import { DEMO_JOBS } from "@/features/job-search/fixtures";
import { deduplicateJobs } from "@/server/jobs/deduplicate";
import {
  SearchFilters,
  SortOption,
  WorkArrangement,
  ExperienceLevel,
  EmploymentType,
  PostingAge,
  Job,
} from "@/types/job";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const query = searchParams.get("q") || "";
  const location = searchParams.get("location") || "All India";
  const daysStr = searchParams.get("days") || searchParams.get("age");
  const limitStr = searchParams.get("limit") || "50";
  const sortBy = (searchParams.get("sort") as SortOption) || "relevance";

  // Parse filter arrays
  const arrangements = searchParams.getAll("arrangement") as WorkArrangement[];
  const experience = searchParams.getAll("experience") as ExperienceLevel[];
  const employment = searchParams.getAll("employment") as EmploymentType[];

  const days = daysStr ? parseInt(daysStr, 10) : undefined;
  const limit = Math.min(Math.max(parseInt(limitStr, 10) || 50, 1), 100);

  const filters: SearchFilters = {
    query,
    location,
    workArrangements: arrangements,
    experienceLevels: experience,
    employmentTypes: employment,
    postingAge: (daysStr as PostingAge) || null,
    sortBy,
  };

  const aggregatedJobs: Job[] = [];
  let isLive = false;
  let providerNotice: string | undefined = undefined;
  let jobvettaRemaining: number | undefined = undefined;
  let jobvettaLimit: number | undefined = undefined;

  // Initialize all providers
  const greenhouse = new GreenhouseClient();
  const lever = new LeverClient();
  const ashby = new AshbyClient();
  const adzuna = new AdzunaClient();
  const jooble = new JoobleClient();
  const apify = new ApifyClient();
  const jobvetta = new JobvettaClient();

  // Parallel asynchronous fetching with individual provider failure isolation
  const providerQueries = [
    // 1. Greenhouse ATS (Keyless)
    greenhouse.search({
      q: query,
      location: location !== "All India" ? location : undefined,
      days,
    }),
    // 2. Lever ATS (Keyless)
    lever.search({
      q: query,
      location: location !== "All India" ? location : undefined,
      days,
    }),
    // 3. Ashby ATS (Keyless)
    ashby.search({
      q: query,
      location: location !== "All India" ? location : undefined,
      days,
    }),
    // 4. Adzuna API (Key-based)
    adzuna.isConfigured()
      ? adzuna.search({ q: query, location, page: 1 })
      : Promise.resolve({ jobs: [] }),
    // 5. Jooble API (Key-based)
    jooble.isConfigured()
      ? jooble.search({ q: query, location, page: 1 })
      : Promise.resolve({ jobs: [] }),
    // 6. Apify API (Key-based)
    apify.isConfigured()
      ? apify.search({ q: query, location })
      : Promise.resolve({ jobs: [] }),
    // 7. Jobvetta API (Key-based)
    jobvetta.isConfigured()
      ? jobvetta.search({
          q: query,
          location: location !== "All India" ? location : undefined,
          days: days && days >= 1 && days <= 365 ? days : undefined,
          limit: 10,
        })
      : Promise.resolve({ jobs: [] }),
  ];

  const results = await Promise.allSettled(providerQueries);

  // Process Greenhouse
  if (results[0].status === "fulfilled" && Array.isArray(results[0].value)) {
    if (results[0].value.length > 0) {
      aggregatedJobs.push(...results[0].value);
      isLive = true;
    }
  }

  // Process Lever
  if (results[1].status === "fulfilled" && Array.isArray(results[1].value)) {
    if (results[1].value.length > 0) {
      aggregatedJobs.push(...results[1].value);
      isLive = true;
    }
  }

  // Process Ashby
  if (results[2].status === "fulfilled" && Array.isArray(results[2].value)) {
    if (results[2].value.length > 0) {
      aggregatedJobs.push(...results[2].value);
      isLive = true;
    }
  }

  // Process Adzuna
  if (results[3].status === "fulfilled" && results[3].value && "jobs" in results[3].value) {
    const r = results[3].value;
    if (r.jobs && r.jobs.length > 0) {
      aggregatedJobs.push(...r.jobs);
      isLive = true;
    }
  }

  // Process Jooble
  if (results[4].status === "fulfilled" && results[4].value && "jobs" in results[4].value) {
    const r = results[4].value;
    if (r.jobs && r.jobs.length > 0) {
      aggregatedJobs.push(...r.jobs);
      isLive = true;
    }
  }

  // Process Apify
  if (results[5].status === "fulfilled" && results[5].value && "jobs" in results[5].value) {
    const r = results[5].value;
    if (r.jobs && r.jobs.length > 0) {
      aggregatedJobs.push(...r.jobs);
      isLive = true;
    }
  }

  // Process Jobvetta
  if (results[6].status === "fulfilled" && results[6].value && "jobs" in results[6].value) {
    const r = results[6].value as any;
    jobvettaRemaining = r.rateLimitRemaining;
    jobvettaLimit = r.rateLimitLimit;
    if (r.jobs && r.jobs.length > 0) {
      aggregatedJobs.push(...r.jobs);
      isLive = true;
    } else if (r.error) {
      providerNotice = r.error;
    }
  }

  // Fallback to Demo Fixtures if no live jobs returned from any provider
  if (aggregatedJobs.length === 0) {
    const demoFiltered = filterAndSortJobs(filters, DEMO_JOBS);
    return NextResponse.json({
      jobs: demoFiltered.jobs,
      total: demoFiltered.totalCount,
      count: demoFiltered.jobs.length,
      source: "demo",
      isDemo: true,
      notice:
        providerNotice ||
        "Showing curated demonstration fixtures. Real ATS career portals query live postings dynamically.",
      rateLimitRemaining: jobvettaRemaining,
      rateLimitLimit: jobvettaLimit,
    });
  }

  // Cross-provider 3-tier canonical deduplication
  const deduped = deduplicateJobs(aggregatedJobs);

  // Apply user filters & sorting
  const finalResult = filterAndSortJobs(filters, deduped.uniqueJobs);

  return NextResponse.json({
    jobs: finalResult.jobs,
    total: finalResult.totalCount,
    count: finalResult.jobs.length,
    source: isLive ? "live" : "demo",
    isDemo: false,
    notice: providerNotice,
    rateLimitRemaining: jobvettaRemaining,
    rateLimitLimit: jobvettaLimit,
  });
}
