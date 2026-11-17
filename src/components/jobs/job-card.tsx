"use client";

import Link from "next/link";
import { Job } from "@/types/job";
import { formatSalary, formatTimeAgo } from "@/lib/utils";
import { useSavedJobs } from "@/features/saved-jobs/useSavedJobs";
import { useCandidateProfile } from "@/features/matching/useCandidateProfile";
import {
  MapPin,
  Bookmark,
  ArrowUpRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

interface JobCardProps {
  job: Job;
}

export function JobCard({ job }: JobCardProps) {
  const { isSaved, toggleSave } = useSavedJobs();
  const { getJobScore, hasProfile } = useCandidateProfile();
  const saved = isSaved(job.id);

  // Compute live deterministic compatibility score if candidate profile is present
  const scoreResult = hasProfile ? getJobScore(job) : null;
  const matchScore = scoreResult?.overallScore ?? (Number(job.providerMeta?.matchScore) || 0);

  // Check if job is fresher-friendly
  const isFresherFriendly =
    job.experienceLevel === "fresher" ||
    job.experienceLevel === "internship" ||
    (job.experienceRange?.minYears !== null && job.experienceRange?.minYears !== undefined && job.experienceRange.minYears <= 1) ||
    /\b(fresher|intern|internship|graduate|entry level|trainee)\b/i.test(job.title);

  // Generate clean initial avatar gradient for company tile
  const getCompanyInitial = (name: string) => {
    return name.trim().charAt(0).toUpperCase() || "J";
  };

  return (
    <div className="group relative rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5 transition-all duration-150 hover:border-neutral-300 hover:shadow-xs">
      <div className="flex items-start gap-3.5 sm:gap-4">
        {/* Company Avatar Tile */}
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-sm font-bold text-white shadow-2xs">
          {getCompanyInitial(job.company)}
        </div>

        {/* Content Column */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                {/* Direct Apply Verification Badge */}
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200/80">
                  <ShieldCheck className="h-3 w-3 text-emerald-600" />
                  <span>Direct 1-Click Apply</span>
                </span>

                {/* Fresher Friendly Badge */}
                {isFresherFriendly && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200/80">
                    🌱 Fresher Friendly
                  </span>
                )}
              </div>

              <h3 className="text-base font-bold text-neutral-900 group-hover:text-blue-600 transition-colors leading-snug">
                <Link href={`/jobs/${encodeURIComponent(job.id)}`} className="focus:outline-none">
                  {job.title}
                </Link>
              </h3>
              <p className="mt-0.5 text-xs text-neutral-600 font-semibold truncate">
                {job.company}
              </p>
            </div>

            {/* Score & Bookmark */}
            <div className="flex items-center gap-1.5 shrink-0">
              {matchScore > 0 && (
                <span
                  title={scoreResult?.summaryText || `Rule-based compatibility score: ${matchScore}/100`}
                  className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 border border-blue-200 shadow-2xs"
                >
                  <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                  <span>{matchScore}%</span>
                </span>
              )}

              <button
                type="button"
                onClick={() => toggleSave(job)}
                className={`inline-flex h-8 w-8 items-center justify-center rounded-xl border transition-colors ${
                  saved
                    ? "bg-amber-50 border-amber-200 text-amber-600"
                    : "border-neutral-200 text-neutral-400 hover:border-neutral-300 hover:text-neutral-700 hover:bg-neutral-50"
                }`}
                title={saved ? "Remove bookmark" : "Save job"}
                aria-label={saved ? "Remove bookmark" : "Save job"}
              >
                <Bookmark className={`h-4 w-4 ${saved ? "fill-amber-500" : ""}`} />
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

          {/* Skill Tag & Action Row */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            {job.requiredSkills && job.requiredSkills.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
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
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-mono text-neutral-500">
                    DEMO
                  </span>
                )}
              </div>
            )}

            {/* Action Buttons: View Details & Direct Apply */}
            <div className="ml-auto flex items-center gap-2">
              <Link
                href={`/jobs/${encodeURIComponent(job.id)}`}
                className="inline-flex items-center gap-1 rounded-xl bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-200 transition-colors"
              >
                View Details
              </Link>
              <a
                href={job.originalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-neutral-900 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-600 transition-colors shadow-2xs"
                title={`Apply directly on official ${job.company} career portal (No third-party login)`}
              >
                <span>Direct Apply</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
