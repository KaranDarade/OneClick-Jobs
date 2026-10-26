import { NextRequest, NextResponse } from "next/server";
import { JobvettaClient } from "@/server/providers/jobvetta/client";
import { filterAndSortJobs } from "@/features/job-search/search";
import { DEMO_JOBS } from "@/features/job-search/fixtures";
import { deduplicateJobs } from "@/server/jobs/deduplicate";
import { SearchFilters, SortOption, WorkArrangement, ExperienceLevel, EmploymentType, PostingAge } from "@/types/job";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const query = searchParams.get("q") || "";
  const location = searchParams.get("location") || "All India";
  const daysStr = searchParams.get("days") || searchParams.get("age");
  const limitStr = searchParams.get("limit") || "10";
  const sortBy = (searchParams.get("sort") as SortOption) || "relevance";

  // Parse arrays
  const arrangements = searchParams.getAll("arrangement") as WorkArrangement[];
  const experience = searchParams.getAll("experience") as ExperienceLevel[];
  const employment = searchParams.getAll("employment") as EmploymentType[];

  const days = daysStr ? parseInt(daysStr, 10) : undefined;
  const limit = Math.min(Math.max(parseInt(limitStr, 10) || 10, 1), 10);

  const filters: SearchFilters = {
    query,
    location,
    workArrangements: arrangements,
    experienceLevels: experience,
    employmentTypes: employment,
    postingAge: daysStr as PostingAge || null,
    sortBy,
  };

  const client = new JobvettaClient();

  // If Jobvetta is configured with an API key, attempt live discovery
  if (client.isConfigured()) {
    const liveResult = await client.search({
      q: query,
      location: location !== "All India" ? location : undefined,
      days: days && days >= 1 && days <= 365 ? days : undefined,
      limit,
    });

    if (liveResult.source !== "demo-fallback" && liveResult.jobs.length > 0) {
      // Run deduplication
      const deduped = deduplicateJobs(liveResult.jobs);

      // Run filtering and sorting
      const finalResult = filterAndSortJobs(filters, deduped.uniqueJobs);

      return NextResponse.json({
        jobs: finalResult.jobs,
        total: liveResult.total,
        count: finalResult.jobs.length,
        source: liveResult.source, // 'live' | 'cache'
        isDemo: false,
        rateLimitRemaining: liveResult.rateLimitRemaining,
        rateLimitLimit: liveResult.rateLimitLimit,
      });
    }

    // If upstream returned error or empty, fallback gracefully with status note
    const fallbackFiltered = filterAndSortJobs(filters, DEMO_JOBS);
    return NextResponse.json({
      jobs: fallbackFiltered.jobs,
      total: fallbackFiltered.totalCount,
      count: fallbackFiltered.jobs.length,
      source: "demo-fallback",
      isDemo: true,
      notice: liveResult.error || "No live matches returned; showing curated demo listings",
      rateLimitRemaining: liveResult.rateLimitRemaining,
      rateLimitLimit: liveResult.rateLimitLimit,
    });
  }

  // Not configured: Run purely in Demo mode
  const demoResult = filterAndSortJobs(filters, DEMO_JOBS);
  return NextResponse.json({
    jobs: demoResult.jobs,
    total: demoResult.totalCount,
    count: demoResult.jobs.length,
    source: "demo",
    isDemo: true,
    notice: "Running in Demo Mode. To connect live India vacancies, set JOBVETTA_API_KEY in .env.local",
  });
}
