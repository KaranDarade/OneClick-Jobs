"use client";

import Link from "next/link";
import { Job } from "@/types/job";
import { formatSalary, formatTimeAgo } from "@/lib/utils";
import { useSavedJobs } from "@/features/saved-jobs/useSavedJobs";
import {
  MapPin,
  Bookmark,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";

interface JobCardProps {
  job: Job;
}

export function JobCard({ job }: JobCardProps) {
  const { isSaved, toggleSave } = useSavedJobs();
  const saved = isSaved(job.id);

  const matchScore = Number(job.providerMeta?.matchScore || 0);

  // Generate clean initial avatar gradient for company tile
  const getCompanyInitial = (name: string) => {
    return name.trim().charAt(0).toUpperCase() || "J";
  };

  return (
    <div className="group relative rounded-xl border border-neutral-200 bg-white p-4 sm:p-5 transition-all duration-150 hover:border-neutral-300 hover:shadow-xs">
      <div className="flex items-start gap-3.5 sm:gap-4">
        {/* Company Avatar Tile (JevJobs 40x40 rounded-10) */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-xs font-bold text-white shadow-2xs">
          {getCompanyInitial(job.company)}
        </div>

        {/* Content Column */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-neutral-900 group-hover:text-blue-600 transition-colors leading-tight">
                <Link href={`/jobs/${encodeURIComponent(job.id)}`} className="focus:outline-none">
                  {job.title}
                </Link>
              </h3>
              <p className="mt-0.5 text-xs text-neutral-500 font-medium truncate">
                {job.company}
              </p>
            </div>

            {/* Score & Bookmark */}
            <div className="flex items-center gap-1.5 shrink-0">
              {matchScore > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700 border border-blue-100">
                  <Sparkles className="h-3 w-3 text-blue-600" />
                  <span>{matchScore}%</span>
                </span>
              )}

              <button
                type="button"
                onClick={() => toggleSave(job.id)}
                className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border transition-colors ${
                  saved
                    ? "bg-amber-50 border-amber-200 text-amber-600"
                    : "border-transparent text-neutral-400 hover:border-neutral-200 hover:text-neutral-700 hover:bg-neutral-50"
                }`}
                title={saved ? "Remove bookmark" : "Save job"}
                aria-label={saved ? "Remove bookmark" : "Save job"}
              >
                <Bookmark className={`h-3.5 w-3.5 ${saved ? "fill-amber-500" : ""}`} />
              </button>
            </div>
          </div>

          {/* Metadata Row: Location, Work Arrangement, Salary */}
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3 text-neutral-400" />
              <span>{job.normalizedCity || job.originalLocation || "India"}</span>
            </span>

            <span className="text-neutral-300">•</span>

            <span className="capitalize font-medium text-neutral-600">
              {job.workArrangement}
            </span>

            <span className="text-neutral-300">•</span>

            <span className="font-medium text-neutral-700">
              {formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency, job.salaryPeriod)}
            </span>

            {job.postedAt && (
              <>
                <span className="text-neutral-300">•</span>
                <span className="text-neutral-400">{formatTimeAgo(job.postedAt)}</span>
              </>
            )}
          </div>

          {/* Skill Tag Pills */}
          {job.requiredSkills && job.requiredSkills.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {job.requiredSkills.slice(0, 4).map((skill) => (
                <span
                  key={skill}
                  className="rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600"
                >
                  {skill}
                </span>
              ))}
              {job.requiredSkills.length > 4 && (
                <span className="text-[10px] text-neutral-400 font-medium">
                  +{job.requiredSkills.length - 4} more
                </span>
              )}

              {job.isDemo && (
                <span className="ml-auto rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-mono text-neutral-500">
                  DEMO
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
