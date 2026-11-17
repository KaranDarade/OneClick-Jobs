"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useSavedJobs } from "@/features/saved-jobs/useSavedJobs";
import { DEMO_JOBS } from "@/features/job-search/fixtures";
import { JobRowItem } from "@/components/jobs/job-row-item";
import { JobTable } from "@/components/jobs/job-table";
import { Job } from "@/types/job";
import { Bookmark, Search, ArrowRight, ShieldCheck, RefreshCw } from "lucide-react";

export default function SavedJobsPage() {
  const { savedJobs, isLoaded, saveJob } = useSavedJobs();
  const [hydratedJobs, setHydratedJobs] = useState<Record<string, Job>>({});
  const [isHydrating, setIsHydrating] = useState(false);

  // Directly available jobs from localStorage cache
  const cachedDirectJobs = useMemo(() => {
    return savedJobs
      .map((item) => item.job)
      .filter((j): j is Job => Boolean(j));
  }, [savedJobs]);

  // Identify IDs that are missing their full job snapshot
  const missingJobIds = useMemo(() => {
    const cachedIds = new Set(cachedDirectJobs.map((j) => j.id));
    return savedJobs
      .filter((item) => !cachedIds.has(item.jobId) && !hydratedJobs[item.jobId])
      .map((item) => item.jobId);
  }, [savedJobs, cachedDirectJobs, hydratedJobs]);

  // Asynchronously hydrate any missing job IDs from DEMO_JOBS or API
  useEffect(() => {
    if (missingJobIds.length === 0) return;

    let isMounted = true;
    setIsHydrating(true);

    async function hydrate() {
      const newlyHydrated: Record<string, Job> = {};

      // 1. Check DEMO_JOBS first for offline instant match
      for (const id of missingJobIds) {
        const demoMatch = DEMO_JOBS.find((dj) => dj.id === id);
        if (demoMatch) {
          newlyHydrated[id] = demoMatch;
        }
      }

      // 2. For remaining unfound IDs, query the API
      const stillMissing = missingJobIds.filter((id) => !newlyHydrated[id]);
      if (stillMissing.length > 0) {
        try {
          const res = await fetch("/api/jobs");
          if (res.ok) {
            const data = await res.json();
            const jobsList: Job[] = data.jobs || [];
            for (const id of stillMissing) {
              const apiMatch = jobsList.find((j) => j.id === id);
              if (apiMatch) {
                newlyHydrated[id] = apiMatch;
              }
            }
          }
        } catch {
          // Ignore hydration errors
        }
      }

      if (isMounted) {
        setHydratedJobs((prev) => ({ ...prev, ...newlyHydrated }));
        setIsHydrating(false);

        // Safely cache hydrated jobs in background
        for (const job of Object.values(newlyHydrated)) {
          saveJob(job);
        }
      }
    }

    hydrate();

    return () => {
      isMounted = false;
    };
  }, [missingJobIds, saveJob]);

  // Combine directly cached jobs and hydrated jobs, preserving save order
  const displayJobList = useMemo(() => {
    const jobMap = new Map<string, Job>();

    for (const job of cachedDirectJobs) {
      jobMap.set(job.id, job);
    }
    for (const [id, job] of Object.entries(hydratedJobs)) {
      jobMap.set(id, job);
    }

    // Preserve savedJobs order
    const list: Job[] = [];
    const seen = new Set<string>();

    for (const item of savedJobs) {
      const job = jobMap.get(item.jobId);
      if (job && !seen.has(job.id)) {
        list.push(job);
        seen.add(job.id);
      }
    }

    return list;
  }, [savedJobs, cachedDirectJobs, hydratedJobs]);

  if (!isLoaded) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center text-xs text-neutral-400">
        Loading saved jobs...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-neutral-200 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
            Saved Jobs
          </h1>
          <p className="mt-0.5 text-xs text-neutral-500">
            Direct-apply positions bookmarked in your browser. Stored offline with instant access.
          </p>
        </div>

        {displayJobList.length > 0 && (
          <Link
            href="/jobs"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-900 hover:text-blue-600"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Discover more jobs</span>
          </Link>
        )}
      </div>

      {/* Local storage banner */}
      <div className="my-5 flex items-start gap-2.5 rounded-xl border border-neutral-200 bg-white p-3.5 text-xs text-neutral-600 shadow-2xs">
        <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <strong className="text-neutral-900 font-medium">Session-Local Privacy:</strong> Your bookmarked jobs are stored in your browser&apos;s local storage. They survive page refreshes and require no third-party accounts or logins.
        </div>
      </div>

      {/* Content */}
      {displayJobList.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-neutral-200 bg-white p-12 text-center my-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400 mb-3">
            <Bookmark className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-semibold text-neutral-900">
            {isHydrating ? "Hydrating saved bookmarks..." : "No saved jobs yet"}
          </h3>
          <p className="mt-1 max-w-xs text-xs text-neutral-500">
            {isHydrating
              ? "Fetching details for your previously saved positions..."
              : "Click the bookmark icon on any job card to save opportunities for easy comparison."}
          </p>
          <Link
            href="/jobs"
            className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 transition-colors"
          >
            <span>Explore Jobs Now</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-neutral-600 uppercase tracking-wider">
              {displayJobList.length} {displayJobList.length === 1 ? "Job" : "Jobs"} Saved
            </p>
            {isHydrating && (
              <span className="flex items-center gap-1 text-[11px] text-neutral-400">
                <RefreshCw className="h-3 w-3 animate-spin" />
                Syncing details...
              </span>
            )}
          </div>

          {/* Unified Table Component with 100% Column Alignment */}
          <JobTable jobs={displayJobList} />
        </div>
      )}
    </div>
  );
}
