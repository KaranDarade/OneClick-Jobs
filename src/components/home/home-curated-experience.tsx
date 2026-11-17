"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  UploadCloud,
  FileCheck,
  ShieldCheck,
  RotateCcw,
  SlidersHorizontal,
  CheckCircle2,
  ExternalLink,
  MapPin,
  Laptop,
  Briefcase,
  GraduationCap,
  X,
  Search,
} from "lucide-react";
import { Job, SearchFilters, SortOption, RoleCategory, WorkArrangement } from "@/types/job";
import { filterAndSortJobs } from "@/features/job-search/search";
import { DEMO_JOBS, POPULAR_INDIAN_CITIES } from "@/features/job-search/fixtures";
import { JobCard } from "@/components/jobs/job-card";
import { JobRowItem } from "@/components/jobs/job-row-item";
import { JobTable } from "@/components/jobs/job-table";
import { FilterPanel } from "@/components/filters/filter-panel";
import { SearchControls } from "@/components/filters/search-controls";
import { Pagination } from "@/components/ui/pagination";
import { useCandidateProfile } from "@/features/matching/useCandidateProfile";
import { buildExternalJobSearchLinks } from "@/server/providers/external-search";

interface ApiJobsResponse {
  jobs: Job[];
  total: number;
  count: number;
  source: "live" | "cache" | "demo" | "demo-fallback";
  isDemo: boolean;
  notice?: string;
}

export function HomeCuratedExperience() {
  const { profile, setProfile, clearProfile, getJobScore, hasProfile } = useCandidateProfile();

  // State: Fresher vs Experienced Selection
  const [experienceMode, setExperienceMode] = useState<"fresher" | "experienced">("fresher");

  // Drag and drop / file upload state
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Search Filters state
  const [filters, setFilters] = useState<SearchFilters>({
    query: "",
    location: "All India",
    workArrangements: [],
    experienceLevels: [],
    employmentTypes: [],
    roleCategories: [],
    isFresherOnly: true,
    postingAge: null,
    sortBy: "relevance",
  });

  // Pagination state (10 jobs per page)
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // Jobs data
  const [apiData, setApiData] = useState<ApiJobsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Keep filters.isFresherOnly in sync with experienceMode
  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      isFresherOnly: experienceMode === "fresher",
    }));
  }, [experienceMode]);

  // If candidate uploaded resume and it hints fresher, sync experienceMode
  useEffect(() => {
    if (profile) {
      if (profile.isFresher || profile.experienceLevelHint === "fresher" || (profile.experienceYears !== null && profile.experienceYears <= 1)) {
        setExperienceMode("fresher");
      } else if (profile.experienceYears && profile.experienceYears > 1) {
        setExperienceMode("experienced");
      }
    }
  }, [profile]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Fetch jobs from server
  useEffect(() => {
    const controller = new AbortController();
    let isCancelled = false;

    async function load() {
      setIsLoading(true);

      const params = new URLSearchParams();
      if (filters.query) params.set("q", filters.query);
      if (filters.location && filters.location !== "All India") params.set("location", filters.location);
      if (filters.sortBy) params.set("sort", filters.sortBy);
      if (filters.postingAge) params.set("days", filters.postingAge);

      filters.workArrangements.forEach((arr) => params.append("arrangement", arr));
      filters.experienceLevels.forEach((exp) => params.append("experience", exp));
      filters.employmentTypes.forEach((emp) => params.append("employment", emp));

      try {
        const res = await fetch(`/api/jobs?${params.toString()}`, { signal: controller.signal });
        if (!res.ok) throw new Error("Failed to load");
        const data: ApiJobsResponse = await res.json();
        if (!isCancelled) {
          setApiData(data);
        }
      } catch {
        // Falls back seamlessly to DEMO_JOBS
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [filters.query, filters.location, filters.sortBy, filters.postingAge, filters.workArrangements, filters.experienceLevels, filters.employmentTypes]);

  const activeDataset = apiData ? apiData.jobs : DEMO_JOBS;

  // Filter & score jobs
  const searchResult = useMemo(() => {
    const effectiveFilters = { ...filters };

    // Enforce strict fresher gate
    if (experienceMode === "fresher" || filters.isFresherOnly) {
      effectiveFilters.isFresherOnly = true;
    }

    const res = filterAndSortJobs(effectiveFilters, activeDataset);

    // Apply smart prioritization based on candidate profile (skills + projects)
    if (hasProfile && (!filters.sortBy || filters.sortBy === "relevance")) {
      const isFresher = experienceMode === "fresher" || profile?.isFresher;

      const scored = [...res.jobs].sort((a, b) => {
        // Priority 1: If fresher, prioritize fresher-friendly jobs to the top
        if (isFresher && (!filters.experienceLevels || filters.experienceLevels.length === 0)) {
          const aIsFresher = a.experienceLevel === "fresher" || a.experienceLevel === "internship";
          const bIsFresher = b.experienceLevel === "fresher" || b.experienceLevel === "internship";
          if (aIsFresher && !bIsFresher) return -1;
          if (!aIsFresher && bIsFresher) return 1;
        }

        // Priority 2: Higher compatibility score (includes React/MERN project resonance boost)
        const scoreA = getJobScore(a)?.overallScore || 0;
        const scoreB = getJobScore(b)?.overallScore || 0;
        if (scoreA !== scoreB) return scoreB - scoreA;

        // Priority 3: Posting date freshness
        return new Date(b.postedAt || 0).getTime() - new Date(a.postedAt || 0).getTime();
      });

      return {
        ...res,
        jobs: scored,
      };
    }

    return res;
  }, [filters, experienceMode, activeDataset, hasProfile, profile, getJobScore]);

  // Paginated 10 jobs per page
  const paginatedJobs = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return searchResult.jobs.slice(start, start + PAGE_SIZE);
  }, [searchResult.jobs, currentPage]);

  // Compute live city and job type counts for sidebar filter badges
  const { cityCounts, jobTypeCounts } = useMemo(() => {
    const cCounts: Record<string, number> = {};
    const jCounts: Record<string, number> = {};

    for (const job of activeDataset) {
      const city = job.normalizedCity || "Others";
      cCounts[city] = (cCounts[city] || 0) + 1;

      const type = job.employmentType || "full-time";
      jCounts[type] = (jCounts[type] || 0) + 1;
    }

    return { cityCounts: cCounts, jobTypeCounts: jCounts };
  }, [activeDataset]);

  // Handle PDF Resume Upload
  const handleUploadResume = async (file: File) => {
    setUploadError(null);

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setUploadError("Please upload a valid PDF document (.pdf format only).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File size exceeds 5MB limit. Please upload a smaller resume.");
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/resume/parse", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process resume.");
      }

      setProfile(data.profile);
    } catch (err: unknown) {
      setUploadError((err as Error).message || "An error occurred while uploading your resume.");
    } finally {
      setIsUploading(false);
    }
  };

  // Cross-platform links
  const targetRole = profile?.extractedSkills?.slice(0, 2).join(" ") || (experienceMode === "fresher" ? "Fresher Software Engineer" : "Software Engineer");
  const externalLinks = buildExternalJobSearchLinks(targetRole, filters.location !== "All India" ? filters.location : "India", experienceMode === "fresher");

  return (
    <div className="flex flex-col">
      {/* Top Onboarding Hero Card */}
      <section className="relative overflow-hidden border-b border-neutral-200 bg-gradient-to-b from-white via-neutral-50/50 to-white py-10 sm:py-14">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/80 px-3.5 py-1 text-xs font-bold text-blue-700 shadow-2xs">
              <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
              <span>Direct Tech Career Discovery • No Third-Party Login Walls</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-neutral-900 leading-tight">
              Get Curated Software Jobs <br />
              <span className="text-blue-600">Tailored to Your Resume & Experience</span>
            </h1>

            <p className="text-sm text-neutral-600 leading-relaxed">
              Every job is verified to lead to an official company ATS application form. Select your experience level and drop your resume to prioritize roles matching your projects.
            </p>
          </div>

          {/* Interactive Onboarding Card (Step 1 + Step 2) */}
          <div className="rounded-3xl border border-neutral-200 bg-white p-6 sm:p-8 shadow-xs max-w-3xl mx-auto space-y-6">
            {/* Step 1: Experience Choice */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Step 1: What type of opportunities are you looking for?
                </span>
                <span className="text-xs font-bold text-blue-600">Required</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setExperienceMode("fresher")}
                  className={`flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                    experienceMode === "fresher"
                      ? "border-emerald-500 bg-emerald-50/60 shadow-xs ring-2 ring-emerald-100"
                      : "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50"
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 ${experienceMode === "fresher" ? "bg-emerald-600 text-white" : "bg-neutral-100 text-neutral-600"}`}>
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                      <span>🌱 Fresher / Entry-Level</span>
                      {experienceMode === "fresher" && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                    </h3>
                    <p className="text-xs text-neutral-600 mt-0.5 leading-relaxed">
                      0–1 years experience. Shows internships, graduate trainees, and junior developer roles.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setExperienceMode("experienced")}
                  className={`flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                    experienceMode === "experienced"
                      ? "border-blue-600 bg-blue-50/60 shadow-xs ring-2 ring-blue-100"
                      : "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50"
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 ${experienceMode === "experienced" ? "bg-blue-600 text-white" : "bg-neutral-100 text-neutral-600"}`}>
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                      <span>💼 Experienced Professional</span>
                      {experienceMode === "experienced" && <CheckCircle2 className="h-4 w-4 text-blue-600" />}
                    </h3>
                    <p className="text-xs text-neutral-600 mt-0.5 leading-relaxed">
                      1+ years experience. Shows mid, senior, lead, and staff engineering openings.
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Step 2: Resume Upload Dropzone */}
            <div className="pt-2 border-t border-neutral-100">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Step 2: Upload Your Resume (PDF) for Instant Match Scoring
                </span>
                <span className="text-[11px] font-semibold text-neutral-400">100% Private • Ephemeral RAM Only</span>
              </div>

              {!hasProfile ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragActive(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleUploadResume(e.dataTransfer.files[0]);
                    }
                  }}
                  className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 sm:p-8 text-center transition-all ${
                    dragActive
                      ? "border-blue-600 bg-blue-50/80"
                      : "border-neutral-200 bg-neutral-50/70 hover:border-blue-400 hover:bg-neutral-50"
                  }`}
                >
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    id="hero-resume-input"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleUploadResume(e.target.files[0]);
                      }
                    }}
                  />

                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white border border-neutral-200 shadow-2xs mb-3 text-blue-600">
                    <UploadCloud className="h-6 w-6" />
                  </div>

                  <p className="text-sm font-bold text-neutral-900">
                    Drag and drop your PDF resume here, or{" "}
                    <label
                      htmlFor="hero-resume-input"
                      className="text-blue-600 hover:text-blue-800 cursor-pointer underline underline-offset-2"
                    >
                      browse files
                    </label>
                  </p>

                  <p className="text-xs text-neutral-500 mt-1">
                    PDF up to 5MB. Automatically identifies your skills and projects (e.g. React, Node.js, MERN).
                  </p>

                  {isUploading && (
                    <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-200">
                      <span className="h-2 w-2 rounded-full bg-blue-600 animate-ping" />
                      <span>Parsing skills, projects, and experience...</span>
                    </div>
                  )}

                  {uploadError && (
                    <p className="mt-3 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1 rounded-lg">
                      {uploadError}
                    </p>
                  )}
                </div>
              ) : (
                /* Profile Active State */
                <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-blue-100">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-2xs">
                        <FileCheck className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                          <span>{profile?.fileName || "Resume"}</span>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                            Active in Feed
                          </span>
                        </h4>
                        <p className="text-xs text-neutral-500">
                          {profile?.extractedSkills?.length || 0} skills detected • {profile?.projects?.length || 0} projects identified
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => clearProfile()}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-500 hover:text-rose-600 transition-colors self-start sm:self-auto"
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>Remove Profile</span>
                    </button>
                  </div>

                  {/* Detected Skills */}
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-600 block mb-1.5">
                      Extracted Technical Skills
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {profile?.extractedSkills?.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-lg bg-white border border-blue-200 px-2.5 py-1 text-xs font-semibold text-blue-900 shadow-2xs"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Projects Highlight if present */}
                  {profile?.projects && profile.projects.length > 0 && (
                    <div className="pt-2 border-t border-blue-100/80">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-600 block mb-1.5">
                        Detected Projects (Boosting Related Job Roles)
                      </span>
                      <div className="space-y-1.5">
                        {profile.projects.map((proj, idx) => (
                          <div key={idx} className="text-xs text-neutral-700 bg-white/80 rounded-xl p-2.5 border border-blue-100">
                            <strong className="text-neutral-900 font-semibold">{proj.title}</strong>
                            {proj.technologies && proj.technologies.length > 0 && (
                              <span className="text-blue-700 font-medium ml-2">
                                [{proj.technologies.join(", ")}]
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Job Feed Section (10 Jobs Per Page) */}
      <section className="py-10 bg-white min-h-[600px]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
                <span>Curated Job Feed</span>
                <span className="text-xs font-bold text-neutral-500 bg-neutral-100 px-2.5 py-0.5 rounded-full">
                  {searchResult.totalCount} Roles
                </span>
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                {experienceMode === "fresher"
                  ? "Showing entry-level, internship, and fresher opportunities (0-1 yrs)"
                  : "Showing all engineering and tech opportunities"}
                {hasProfile && " • Prioritized according to your resume skills and projects"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setMobileFiltersOpen(true)}
              className="lg:hidden inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3.5 py-2 text-xs font-semibold text-neutral-700 self-start"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>Filters</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left Filter Panel */}
            <div className="hidden lg:block lg:col-span-3">
              <div className="sticky top-20">
                <FilterPanel
                  filters={filters}
                  onFilterChange={setFilters}
                  cityCounts={cityCounts}
                  jobTypeCounts={jobTypeCounts}
                  onReset={() =>
                    setFilters({
                      query: "",
                      location: "All India",
                      selectedCities: [],
                      workArrangements: [],
                      experienceLevels: [],
                      employmentTypes: [],
                      roleCategories: [],
                      isFresherOnly: experienceMode === "fresher",
                      postingAge: null,
                      sortBy: "relevance",
                    })
                  }
                  totalResults={searchResult.totalCount}
                />
              </div>
            </div>

            {/* Right Job Table Feed */}
            <div className="lg:col-span-9 space-y-4">
              <SearchControls
                filters={filters}
                onFilterChange={setFilters}
                onToggleMobileFilters={() => setMobileFiltersOpen(true)}
                totalResults={searchResult.totalCount}
              />

              {/* Subtitle / Curation Notice matching screenshot */}
              <div className="px-1 py-1 text-xs text-neutral-500 leading-relaxed">
                Handpicked daily by our placement team from LinkedIn, Naukri, Internshala and company career pages. Apply opens the original posting.
              </div>

              {isLoading && !apiData ? (
                <div className="space-y-3 pt-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 rounded-xl border border-neutral-200 bg-white p-4 animate-pulse">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-neutral-100" />
                        <div className="space-y-2 flex-1">
                          <div className="h-4 w-1/3 rounded bg-neutral-100" />
                          <div className="h-3 w-1/4 rounded bg-neutral-100" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : paginatedJobs.length === 0 ? (
                <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center my-4">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-500 mb-3">
                    <SlidersHorizontal className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-semibold text-neutral-900">
                    No matching opportunities found
                  </h3>
                  <p className="mt-1 text-xs text-neutral-500 max-w-sm mx-auto">
                    Try loosening your filters or switch between Fresher and All Tech Roles.
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setFilters({
                        query: "",
                        location: "All India",
                        selectedCities: [],
                        workArrangements: [],
                        experienceLevels: [],
                        employmentTypes: [],
                        roleCategories: [],
                        isFresherOnly: false,
                        postingAge: null,
                        sortBy: "relevance",
                      })
                    }
                    className="mt-4 inline-flex items-center rounded-full bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 transition-colors"
                  >
                    Clear all filters
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Semantic Unified Table with 100% Column Alignment */}
                  <JobTable jobs={paginatedJobs} />

                  {/* 10 Jobs Per Page Pagination */}
                  <Pagination
                    currentPage={currentPage}
                    totalCount={searchResult.totalCount}
                    pageSize={PAGE_SIZE}
                    onPageChange={(page) => {
                      setCurrentPage(page);
                      window.scrollTo({ top: 400, behavior: "smooth" });
                    }}
                  />
                </div>
              )}

              {/* Cross-Platform Search Direct Links (LinkedIn, Indeed, Naukri) */}
              <div className="mt-8 rounded-2xl border border-neutral-200 bg-neutral-50/80 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                    <span>Search Direct Openings on External Platforms</span>
                  </h3>
                  <span className="text-[10px] font-bold text-neutral-400">Past 24 Hours • Direct Apply</span>
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Looking for more live postings matching your skills in {filters.location !== "All India" ? filters.location : "India"}? Launch direct queries targeting verified company postings:
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <a
                    href={externalLinks.linkedInUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-700 shadow-2xs hover:border-[#0A66C2] hover:text-[#0A66C2] transition-colors"
                  >
                    <span>LinkedIn (Past 24h)</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <a
                    href={externalLinks.indeedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-700 shadow-2xs hover:border-[#2164f3] hover:text-[#2164f3] transition-colors"
                  >
                    <span>Indeed India (Direct)</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <a
                    href={externalLinks.naukriUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-700 shadow-2xs hover:border-blue-600 hover:text-blue-600 transition-colors"
                  >
                    <span>Naukri.com (Fresh)</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile Drawer */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-xs" onClick={() => setMobileFiltersOpen(false)} />
          <div className="relative ml-auto flex h-full w-full max-w-xs flex-col overflow-y-auto bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-200">
              <h2 className="text-sm font-bold text-neutral-900">Filter Listings</h2>
              <button type="button" onClick={() => setMobileFiltersOpen(false)} className="rounded-lg p-1 text-neutral-400 hover:text-neutral-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="py-4">
              <FilterPanel
                filters={filters}
                onFilterChange={setFilters}
                cityCounts={cityCounts}
                jobTypeCounts={jobTypeCounts}
                onReset={() =>
                  setFilters({
                    query: "",
                    location: "All India",
                    selectedCities: [],
                    workArrangements: [],
                    experienceLevels: [],
                    employmentTypes: [],
                    roleCategories: [],
                    isFresherOnly: false,
                    postingAge: null,
                    sortBy: "relevance",
                  })
                }
                totalResults={searchResult.totalCount}
              />
            </div>
            <div className="mt-auto pt-4 border-t border-neutral-200">
              <button type="button" onClick={() => setMobileFiltersOpen(false)} className="w-full rounded-full bg-neutral-900 py-2.5 text-xs font-semibold text-white">
                View {searchResult.totalCount} Results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
