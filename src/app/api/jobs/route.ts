import { NextRequest, NextResponse } from "next/server";
import { JobvettaClient } from "@/server/providers/jobvetta/client";
import { GreenhouseClient } from "@/server/providers/greenhouse/client";
import { filterAndSortJobs } from "@/features/job-search/search";
import { DEMO_JOBS } from "@/features/job-search/fixtures";
import { deduplicateJobs } from "@/server/jobs/deduplicate";
import { SearchFilters, SortOption, WorkArrangement, ExperienceLevel, EmploymentType, PostingAge, Job } from "@/types/job";

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

  // 1. Fetch from Greenhouse ATS boards (keyless, 100% free, 350+ live India tech roles)
  const greenhouse = new GreenhouseClient();
  try {
    const ghJobs = await greenhouse.search({
      q: query,
      location: location !== "All India" ? location : undefined,
      days,
    });
    if (ghJobs.length > 0) {
      aggregatedJobs.push(...ghJobs);
      isLive = true;
    }
  } catch {
    // Individual provider failure isolation
  }

  // 2. Fetch from Jobvetta if configured
  const jobvetta = new JobvettaClient();
  if (jobvetta.isConfigured()) {
    try {
      const jvResult = await jobvetta.search({
        q: query,
        location: location !== "All India" ? location : undefined,
        days: days && days >= 1 && days <= 365 ? days : undefined,
        limit: 10,
      });

      jobvettaRemaining = jvResult.rateLimitRemaining;
      jobvettaLimit = jvResult.rateLimitLimit;

      if (jvResult.jobs.length > 0) {
        aggregatedJobs.push(...jvResult.jobs);
        isLive = true;
      } else if (jvResult.error) {
        providerNotice = jvResult.error;
      }
    } catch {
      // Failure isolation
    }
  }

  // 3. Fallback to Demo Fixtures if no live jobs returned from any provider
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

  // 4. Run cross-provider 3-tier canonical deduplication
  const deduped = deduplicateJobs(aggregatedJobs);

  // 5. Apply user filters & sorting
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
