"use client";

import Link from "next/link";
import { Job } from "@/types/job";
import { formatShortDate, getJobSourceAttribution } from "@/lib/utils";
import { useSavedJobs } from "@/features/saved-jobs/useSavedJobs";
import { useCandidateProfile } from "@/features/matching/useCandidateProfile";
import { Bookmark, Sparkles, ShieldCheck } from "lucide-react";

interface JobRowItemProps {
  job: Job;
}

export function JobRowItem({ job }: JobRowItemProps) {
  const { isSaved, toggleSave } = useSavedJobs();
  const { getJobScore, hasProfile } = useCandidateProfile();
  const saved = isSaved(job.id);

  // Compute live match score if candidate profile is present
  const scoreResult = hasProfile ? getJobScore(job) : null;
  const matchScore = scoreResult?.overallScore ?? (Number(job.providerMeta?.matchScore) || 0);

  const isFresherFriendly =
    job.experienceLevel === "fresher" ||
    job.experienceLevel === "internship" ||
    (job.experienceRange?.minYears !== null && job.experienceRange?.minYears !== undefined && job.experienceRange.minYears <= 1) ||
    /\b(fresher|intern|internship|graduate|entry level|trainee)\b/i.test(job.title);

  const sourceAttribution = getJobSourceAttribution(job);
  const displayLocation = job.normalizedCity || job.originalLocation || "India";
  const postedDate = formatShortDate(job.postedAt);

  // Take top 3-4 skills for compact display
  const displaySkills = job.requiredSkills.slice(0, 4);

  return (
    <div className="group relative rounded-xl border border-neutral-200/90 bg-white p-4 transition-all duration-150 hover:border-neutral-300 hover:shadow-xs">
      <div className="flex flex-col md:grid md:grid-cols-12 md:items-center gap-3 md:gap-4">
        {/* Column 1: Role and company (col-span-5) */}
        <div className="md:col-span-5 min-w-0 pr-2">
          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
            {isFresherFriendly && (
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.2 text-[10px] font-bold text-emerald-800 border border-emerald-200/70">
                🌱 Fresher
              </span>
            )}
            {matchScore > 0 && (
              <span
                title={scoreResult?.summaryText || `Match score: ${matchScore}%`}
                className="inline-flex items-center gap-0.5 rounded-full bg-blue-50 px-2 py-0.2 text-[10px] font-bold text-blue-700 border border-blue-200/80"
              >
                <Sparkles className="h-2.5 w-2.5 text-blue-600" />
                <span>{matchScore}%</span>
              </span>
            )}
          </div>

          <h3 className="text-sm font-bold text-neutral-900 group-hover:text-blue-600 transition-colors leading-snug">
            <Link href={`/jobs/${encodeURIComponent(job.id)}`} className="focus:outline-none hover:underline">
              {job.title}
            </Link>
          </h3>

          <p className="text-xs text-neutral-600 font-medium mt-0.5 truncate">
            {job.company}
          </p>

          <p className="text-[11px] text-neutral-400 capitalize mt-0.5">
            {job.employmentType?.replace("-", " ") || "Full time"}
          </p>
        </div>

        {/* Column 2: Location (col-span-2) */}
        <div className="md:col-span-2 text-xs font-medium text-neutral-700">
          <span className="md:hidden text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-0.5">
            Location
          </span>
          <span className="truncate block">{displayLocation}</span>
        </div>

        {/* Column 3: Skills (col-span-2) */}
        <div className="md:col-span-2">
          <span className="md:hidden text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
            Skills
          </span>
          <div className="flex flex-wrap gap-1">
            {displaySkills.length > 0 ? (
              displaySkills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-700 hover:bg-neutral-200 transition-colors"
                >
                  {skill}
                </span>
              ))
            ) : (
              <span className="text-[11px] text-neutral-400">—</span>
            )}
          </div>
        </div>

        {/* Column 4: Posted (col-span-1) */}
        <div className="md:col-span-1 text-xs text-neutral-500 font-medium whitespace-nowrap">
          <span className="md:hidden text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-0.5">
            Posted
          </span>
          <span>{postedDate}</span>
        </div>

        {/* Column 5: Action (col-span-2: Apply button & Bookmark & Source Attribution) */}
        <div className="md:col-span-2 flex flex-col items-start md:items-end justify-center pt-2 md:pt-0 border-t md:border-t-0 border-neutral-100">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => toggleSave(job)}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
                saved
                  ? "bg-amber-50 border-amber-200 text-amber-600"
                  : "border-neutral-200 text-neutral-400 hover:border-neutral-300 hover:text-neutral-700 hover:bg-neutral-50"
              }`}
              title={saved ? "Remove bookmark" : "Save job"}
              aria-label={saved ? "Remove bookmark" : "Save job"}
            >
              <Bookmark className={`h-4 w-4 ${saved ? "fill-amber-500" : ""}`} />
            </button>

            <a
              href={job.originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-xs hover:bg-blue-700 active:scale-[0.98] transition-all"
            >
              Apply
            </a>
          </div>

          <span className="text-[10px] text-neutral-400 font-normal mt-1 text-right">
            {sourceAttribution}
          </span>
        </div>
      </div>
    </div>
  );
}
