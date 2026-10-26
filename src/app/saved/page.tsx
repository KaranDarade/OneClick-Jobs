"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSavedJobs } from "@/features/saved-jobs/useSavedJobs";
import { DEMO_JOBS } from "@/features/job-search/fixtures";
import { JobCard } from "@/components/jobs/job-card";
import { Bookmark, Search, ArrowRight, ShieldCheck } from "lucide-react";

export default function SavedJobsPage() {
  const { savedJobs, isLoaded } = useSavedJobs();

  // Look up full job details for saved IDs
  const savedJobList = useMemo(() => {
    const savedIds = new Set(savedJobs.map((item) => item.jobId));
    return DEMO_JOBS.filter((job) => savedIds.has(job.id));
  }, [savedJobs]);

  if (!isLoaded) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center text-xs text-neutral-400">
        Loading saved jobs...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-neutral-200 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
            Saved Jobs
          </h1>
          <p className="mt-0.5 text-xs text-neutral-500">
            Positions bookmarked in your current browser session.
          </p>
        </div>

        {savedJobList.length > 0 && (
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
        <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <strong className="text-neutral-900 font-medium">Session-Local Storage:</strong> Your bookmarks are stored locally in your browser. No login or cloud database required.
        </div>
      </div>

      {/* Content */}
      {savedJobList.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-neutral-200 bg-white p-12 text-center my-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400 mb-3">
            <Bookmark className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-semibold text-neutral-900">
            No saved jobs yet
          </h3>
          <p className="mt-1 max-w-xs text-xs text-neutral-500">
            Click the bookmark icon on any job card to save opportunities for comparison.
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
        <div className="mt-6 space-y-3">
          <p className="text-xs font-semibold text-neutral-500">
            {savedJobList.length} {savedJobList.length === 1 ? "Job" : "Jobs"} Saved
          </p>
          <div className="space-y-3">
            {savedJobList.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
