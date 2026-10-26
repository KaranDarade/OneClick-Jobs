"use client";

import { useState, useMemo, useEffect, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { SearchFilters, SortOption, Job } from "@/types/job";
import { filterAndSortJobs } from "@/features/job-search/search";
import { DEMO_JOBS } from "@/features/job-search/fixtures";
import { JobCard } from "@/components/jobs/job-card";
import { FilterPanel } from "@/components/filters/filter-panel";
import { SearchControls } from "@/components/filters/search-controls";
import { EmptyState } from "@/components/ui/empty-state";
import { X, SlidersHorizontal, Radio, ShieldCheck, Zap } from "lucide-react";

interface ApiJobsResponse {
  jobs: Job[];
  total: number;
  count: number;
  source: "live" | "cache" | "demo" | "demo-fallback";
  isDemo: boolean;
  notice?: string;
  rateLimitRemaining?: number;
  rateLimitLimit?: number;
}

function JobsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Read initial filter values from URL search params
  const initialQuery = searchParams.get("q") || "";
  const initialLocation = searchParams.get("location") || "All India";
  const initialSort = (searchParams.get("sort") as SortOption) || "relevance";

  const [filters, setFilters] = useState<SearchFilters>({
    query: initialQuery,
    location: initialLocation,
    workArrangements: [],
    experienceLevels: [],
    employmentTypes: [],
    postingAge: null,
    sortBy: initialSort,
  });

  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [apiData, setApiData] = useState<ApiJobsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Sync state changes back to URL parameters
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.query) params.set("q", filters.query);
    if (filters.location && filters.location !== "All India") params.set("location", filters.location);
    if (filters.sortBy && filters.sortBy !== "relevance") params.set("sort", filters.sortBy);

    const qs = params.toString();
    const newPath = qs ? `/jobs?${qs}` : "/jobs";
    router.replace(newPath, { scroll: false });
  }, [filters.query, filters.location, filters.sortBy, router]);

  // Fetch jobs from server Route Handler /api/jobs
  const fetchJobs = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);

    const params = new URLSearchParams();
    if (filters.query) params.set("q", filters.query);
    if (filters.location && filters.location !== "All India") params.set("location", filters.location);
    if (filters.sortBy) params.set("sort", filters.sortBy);
    if (filters.postingAge) params.set("days", filters.postingAge);

    filters.workArrangements.forEach((arr) => params.append("arrangement", arr));
    filters.experienceLevels.forEach((exp) => params.append("experience", exp));
    filters.employmentTypes.forEach((emp) => params.append("employment", emp));

    try {
      const res = await fetch(`/api/jobs?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Server returned error (${res.status})`);
      }
      const data: ApiJobsResponse = await res.json();
      setApiData(data);
    } catch {
      setFetchError("Unable to reach search service; falling back to offline demo index.");
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Active dataset: API response jobs, with offline fallback to local DEMO_JOBS
  const activeDataset = apiData ? apiData.jobs : DEMO_JOBS;

  // Compute filtered & sorted results locally for instant client-side responsiveness
  const searchResult = useMemo(() => {
    return filterAndSortJobs(filters, activeDataset);
  }, [filters, activeDataset]);

  const handleResetFilters = () => {
    setFilters({
      query: "",
      location: "All India",
      workArrangements: [],
      experienceLevels: [],
      employmentTypes: [],
      postingAge: null,
      sortBy: "relevance",
    });
  };

  const isLive = apiData?.source === "live" || apiData?.source === "cache";
  const isDemoFallback = apiData?.source === "demo-fallback";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* JevJobs Status Indicator Ribbon */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white p-3.5 shadow-2xs">
        <div className="flex items-center gap-2.5">
          {isLive ? (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Jobvetta Live Feed</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700 bg-neutral-100 border border-neutral-200 px-2.5 py-0.5 rounded-full">
              <Radio className="h-3 w-3 text-neutral-500" />
              <span>{isDemoFallback ? "Demo Fallback" : "Demo Mode"}</span>
            </div>
          )}

          <span className="text-xs text-neutral-500 hidden sm:inline">
            {isLive
              ? `Live provider active ${apiData?.rateLimitRemaining !== undefined ? `(${apiData.rateLimitRemaining} daily requests remaining)` : ""}`
              : "Showing curated India tech listings for testing."}
          </span>
        </div>

        {apiData?.notice && (
          <div className="text-xs text-neutral-500 flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-blue-600 shrink-0" />
            <span className="truncate max-w-[260px] sm:max-w-md">{apiData.notice}</span>
          </div>
        )}
      </div>

      {/* Main 2-Panel Results Layout matching JevJobs */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Filters Panel */}
        <div className="hidden lg:block lg:col-span-4">
          <div className="sticky top-20">
            <FilterPanel
              filters={filters}
              onFilterChange={setFilters}
              onReset={handleResetFilters}
              totalResults={searchResult.totalCount}
            />
          </div>
        </div>

        {/* Right Search & Matches Panel */}
        <div className="lg:col-span-8 space-y-4">
          <SearchControls
            filters={filters}
            onFilterChange={setFilters}
            onToggleMobileFilters={() => setMobileDrawerOpen(true)}
            totalResults={searchResult.totalCount}
          />

          {/* Job Cards Stream */}
          {isLoading && !apiData ? (
            <div className="space-y-3 pt-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-28 rounded-xl border border-neutral-200 bg-white p-4 animate-pulse"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-neutral-100 shrink-0" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 w-1/3 rounded bg-neutral-100" />
                      <div className="h-3 w-1/4 rounded bg-neutral-100" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : searchResult.jobs.length === 0 ? (
            <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center my-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-500 mb-3">
                <SlidersHorizontal className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-neutral-900">
                No matching opportunities found
              </h3>
              <p className="mt-1 text-xs text-neutral-500 max-w-sm mx-auto">
                Try loosening your filters or search for another technology stack or Indian city.
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-4 inline-flex items-center rounded-full bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 transition-colors"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {searchResult.jobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Filters Drawer */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-neutral-900/50 backdrop-blur-xs"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div className="relative ml-auto flex h-full w-full max-w-xs flex-col overflow-y-auto bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-200">
              <h2 className="text-sm font-bold text-neutral-900">Filter Listings</h2>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="rounded-lg p-1 text-neutral-400 hover:text-neutral-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="py-4">
              <FilterPanel
                filters={filters}
                onFilterChange={setFilters}
                onReset={handleResetFilters}
                totalResults={searchResult.totalCount}
              />
            </div>
            <div className="mt-auto pt-4 border-t border-neutral-200">
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="w-full rounded-full bg-neutral-900 py-2.5 text-xs font-semibold text-white"
              >
                View {searchResult.totalCount} Results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function JobsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-5xl px-4 py-12 text-center text-xs text-neutral-400">
          Loading jobs...
        </div>
      }
    >
      <JobsContent />
    </Suspense>
  );
}
