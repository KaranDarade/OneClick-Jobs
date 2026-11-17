"use client";

import Link from "next/link";
import { Job } from "@/types/job";
import { formatShortDate, getJobSourceAttribution } from "@/lib/utils";
import { useSavedJobs } from "@/features/saved-jobs/useSavedJobs";
import { useCandidateProfile } from "@/features/matching/useCandidateProfile";
import { Bookmark, Sparkles, MapPin } from "lucide-react";

interface JobTableProps {
  jobs: Job[];
}

export function JobTable({ jobs }: JobTableProps) {
  const { isSaved, toggleSave } = useSavedJobs();
  const { getJobScore, hasProfile } = useCandidateProfile();

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white shadow-2xs overflow-hidden">
      {/* Desktop / Tablet Semantic Table View (100% Guaranteed Column Alignment) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse table-fixed min-w-[760px]">
          <colgroup>
            <col className="w-[34%]" />
            <col className="w-[16%]" />
            <col className="w-[24%]" />
            <col className="w-[10%]" />
            <col className="w-[16%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50/85 text-xs font-semibold text-neutral-600 select-none">
              <th scope="col" className="pl-5 pr-3 py-3.5 text-left font-bold text-neutral-800">
                Role and company
              </th>
              <th scope="col" className="px-3 py-3.5 text-left font-bold text-neutral-800">
                Location
              </th>
              <th scope="col" className="px-3 py-3.5 text-left font-bold text-neutral-800">
                Skills
              </th>
              <th scope="col" className="px-2 py-3.5 text-left font-bold text-neutral-800">
                Posted
              </th>
              <th scope="col" className="pl-2 pr-5 py-3.5 text-right font-bold text-neutral-800">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 bg-white">
            {jobs.map((job) => {
              const saved = isSaved(job.id);
              const scoreResult = hasProfile ? getJobScore(job) : null;
              const matchScore = scoreResult?.overallScore ?? (Number(job.providerMeta?.matchScore) || 0);

              const isFresherFriendly =
                job.experienceLevel === "fresher" ||
                job.experienceLevel === "internship" ||
                (job.experienceRange?.minYears !== null &&
                  job.experienceRange?.minYears !== undefined &&
                  job.experienceRange.minYears <= 1) ||
                /\b(fresher|intern|internship|graduate|entry level|trainee)\b/i.test(job.title);

              const sourceAttribution = getJobSourceAttribution(job);
              const displayLocation = job.normalizedCity || job.originalLocation || "India";
              const postedDate = formatShortDate(job.postedAt);
              const displaySkills = job.requiredSkills.slice(0, 4);

              return (
                <tr
                  key={job.id}
                  className="group hover:bg-neutral-50/60 transition-colors duration-100"
                >
                  {/* Column 1: Role and company */}
                  <td className="pl-5 pr-3 py-4 align-top">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      {isFresherFriendly && (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200/70">
                          🌱 Fresher
                        </span>
                      )}
                      {matchScore > 0 && (
                        <span
                          title={scoreResult?.summaryText || `Match score: ${matchScore}%`}
                          className="inline-flex items-center gap-0.5 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200/80"
                        >
                          <Sparkles className="h-2.5 w-2.5 text-blue-600" />
                          <span>{matchScore}%</span>
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-neutral-900 group-hover:text-blue-600 transition-colors leading-snug">
                      <Link
                        href={`/jobs/${encodeURIComponent(job.id)}`}
                        className="focus:outline-none hover:underline"
                      >
                        {job.title}
                      </Link>
                    </h3>

                    <p className="text-xs text-neutral-600 font-medium mt-0.5 truncate">
                      {job.company}
                    </p>

                    <p className="text-[11px] text-neutral-400 capitalize mt-0.5">
                      {job.employmentType?.replace("-", " ") || "Full time"}
                    </p>
                  </td>

                  {/* Column 2: Location */}
                  <td className="px-3 py-4 align-top text-xs font-medium text-neutral-700">
                    <div className="pt-1 truncate" title={displayLocation}>
                      {displayLocation}
                    </div>
                  </td>

                  {/* Column 3: Skills */}
                  <td className="px-3 py-4 align-top">
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      {displaySkills.length > 0 ? (
                        displaySkills.map((skill) => (
                          <span
                            key={skill}
                            className="inline-flex items-center rounded-md bg-neutral-100 px-2.5 py-0.5 text-[11px] font-medium text-neutral-700 hover:bg-neutral-200 transition-colors"
                          >
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-neutral-300">—</span>
                      )}
                    </div>
                  </td>

                  {/* Column 4: Posted */}
                  <td className="px-2 py-4 align-top text-xs text-neutral-500 font-medium whitespace-nowrap">
                    <div className="pt-1">{postedDate}</div>
                  </td>

                  {/* Column 5: Action */}
                  <td className="pl-2 pr-5 py-4 align-top text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => toggleSave(job)}
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors shrink-0 ${
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
                        className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-xs hover:bg-blue-700 active:scale-[0.98] transition-all whitespace-nowrap"
                      >
                        Apply
                      </a>
                    </div>

                    <div className="text-[10px] text-neutral-400 font-normal mt-1.5 text-right whitespace-nowrap">
                      {sourceAttribution}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View (Screens < 768px: Highly Responsive, Zero Horizontal Pinching) */}
      <div className="block md:hidden divide-y divide-neutral-100">
        {jobs.map((job) => {
          const saved = isSaved(job.id);
          const scoreResult = hasProfile ? getJobScore(job) : null;
          const matchScore = scoreResult?.overallScore ?? (Number(job.providerMeta?.matchScore) || 0);

          const isFresherFriendly =
            job.experienceLevel === "fresher" ||
            job.experienceLevel === "internship" ||
            (job.experienceRange?.minYears !== null &&
              job.experienceRange?.minYears !== undefined &&
              job.experienceRange.minYears <= 1) ||
            /\b(fresher|intern|internship|graduate|entry level|trainee)\b/i.test(job.title);

          const sourceAttribution = getJobSourceAttribution(job);
          const displayLocation = job.normalizedCity || job.originalLocation || "India";
          const postedDate = formatShortDate(job.postedAt);
          const displaySkills = job.requiredSkills.slice(0, 4);

          return (
            <div key={job.id} className="p-4 space-y-3 bg-white">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                    {isFresherFriendly && (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200/70">
                        🌱 Fresher
                      </span>
                    )}
                    {matchScore > 0 && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200/80">
                        <Sparkles className="h-2.5 w-2.5 text-blue-600" />
                        <span>{matchScore}%</span>
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-neutral-900 leading-snug">
                    <Link
                      href={`/jobs/${encodeURIComponent(job.id)}`}
                      className="hover:underline focus:outline-none"
                    >
                      {job.title}
                    </Link>
                  </h3>
                  <p className="text-xs text-neutral-600 font-medium mt-0.5">{job.company}</p>
                </div>

                <button
                  type="button"
                  onClick={() => toggleSave(job)}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border shrink-0 ${
                    saved
                      ? "bg-amber-50 border-amber-200 text-amber-600"
                      : "border-neutral-200 text-neutral-400 hover:text-neutral-700"
                  }`}
                  aria-label={saved ? "Remove bookmark" : "Save job"}
                >
                  <Bookmark className={`h-4 w-4 ${saved ? "fill-amber-500" : ""}`} />
                </button>
              </div>

              {/* Mobile Meta: Location & Date */}
              <div className="flex items-center justify-between text-xs text-neutral-500 pt-0.5">
                <span className="flex items-center gap-1 font-medium text-neutral-700">
                  <MapPin className="h-3 w-3 text-neutral-400" />
                  <span>{displayLocation}</span>
                </span>
                <span>{postedDate}</span>
              </div>

              {/* Mobile Skills */}
              {displaySkills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {displaySkills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-700"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}

              {/* Mobile Action Bar */}
              <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
                <span className="text-[10px] text-neutral-400 font-normal">
                  {sourceAttribution}
                </span>

                <a
                  href={job.originalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white shadow-xs hover:bg-blue-700"
                >
                  Apply
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
