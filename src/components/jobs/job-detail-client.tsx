"use client";

import Link from "next/link";
import { Job } from "@/types/job";
import { formatSalary, formatTimeAgo } from "@/lib/utils";
import { useSavedJobs } from "@/features/saved-jobs/useSavedJobs";
import { useCandidateProfile } from "@/features/matching/useCandidateProfile";
import {
  MapPin,
  Bookmark,
  ExternalLink,
  ArrowLeft,
  CheckCircle2,
  ShieldAlert,
  Sparkles,
  Check,
  X,
  HelpCircle,
} from "lucide-react";

interface JobDetailClientProps {
  job: Job;
}

export function JobDetailClient({ job }: JobDetailClientProps) {
  const { isSaved, toggleSave } = useSavedJobs();
  const { getJobScore, hasProfile } = useCandidateProfile();
  const saved = isSaved(job.id);

  // Compute live deterministic score
  const scoreResult = hasProfile ? getJobScore(job) : null;
  const matchScore = scoreResult?.overallScore ?? (Number(job.providerMeta?.matchScore) || 0);

  const getCompanyInitial = (name: string) => {
    return name.trim().charAt(0).toUpperCase() || "J";
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back to Jobs Link */}
      <Link
        href="/jobs"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 mb-5 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back to search results</span>
      </Link>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8 space-y-6">
        {/* Top Header Card */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-neutral-100 pb-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-neutral-900 text-sm font-bold text-white">
              {getCompanyInitial(job.company)}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium capitalize text-neutral-700">
                  {job.workArrangement}
                </span>
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium capitalize text-neutral-700">
                  {job.employmentType}
                </span>
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium capitalize text-neutral-700">
                  {job.experienceLevel}
                </span>
                {job.isDemo && (
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-mono text-neutral-500">
                    DEMO RECORD
                  </span>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
                {job.title}
              </h1>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
                <strong className="font-semibold text-neutral-800">{job.company}</strong>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-neutral-400" />
                  {job.normalizedCity || job.originalLocation} ({job.country})
                </span>
                <span>•</span>
                <span className="font-semibold text-neutral-800">
                  {formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency, job.salaryPeriod)}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            {matchScore > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 border border-blue-100 mr-2">
                <Sparkles className="h-3 w-3 text-blue-600" />
                <span>{matchScore}% Match</span>
              </span>
            )}

            <button
              type="button"
              onClick={() => toggleSave(job.id)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors ${
                saved
                  ? "bg-amber-50 border-amber-200 text-amber-700"
                  : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
              }`}
            >
              <Bookmark className={`h-3.5 w-3.5 ${saved ? "fill-amber-500 text-amber-600" : ""}`} />
              <span>{saved ? "Saved" : "Save"}</span>
            </button>

            <a
              href={job.originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 transition-colors"
            >
              <span>Apply Directly</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        {/* Demo Warning Pill if applicable */}
        {job.isDemo && (
          <div className="flex items-start gap-2.5 rounded-xl border border-neutral-200 bg-neutral-50 p-3.5 text-xs text-neutral-600">
            <ShieldAlert className="h-4 w-4 text-neutral-500 shrink-0 mt-0.5" />
            <div>
              <strong className="text-neutral-900 font-medium">Demonstration Listing:</strong> This position is a test fixture used for validating search criteria and skill matching. In live production mode, candidates link directly to employer applicant tracking portals.
            </div>
          </div>
        )}

        {/* Deterministic Match Compatibility Breakdown (Phase 5) */}
        {scoreResult && scoreResult.overallScore !== null && (
          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-600" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-blue-900">
                  Rule-Based Compatibility Breakdown: {scoreResult.overallScore}/100
                </h2>
              </div>
              <span className="text-[10px] font-mono text-neutral-400">
                {scoreResult.algorithmVersion}
              </span>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed">
              {scoreResult.summaryText}
            </p>

            {/* Component Meters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
              <div className="rounded-lg bg-white p-2.5 border border-neutral-200 space-y-1">
                <div className="flex justify-between text-neutral-600">
                  <span>Required Skills</span>
                  <span className="font-semibold text-neutral-900">
                    {scoreResult.components.requiredSkills.score} / {scoreResult.components.requiredSkills.effectiveWeight} pts
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500">
                  {scoreResult.components.requiredSkills.explanation}
                </p>
              </div>

              <div className="rounded-lg bg-white p-2.5 border border-neutral-200 space-y-1">
                <div className="flex justify-between text-neutral-600">
                  <span>Experience Alignment</span>
                  <span className="font-semibold text-neutral-900">
                    {scoreResult.components.experience.score} / {scoreResult.components.experience.effectiveWeight} pts
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500">
                  {scoreResult.components.experience.explanation}
                </p>
              </div>
            </div>

            {/* Matched vs Missing Skills */}
            {(scoreResult.matchingRequiredSkills.length > 0 || scoreResult.missingRequiredSkills.length > 0) && (
              <div className="pt-2 flex flex-wrap gap-2 text-xs">
                {scoreResult.matchingRequiredSkills.map((s) => (
                  <span key={s} className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[11px] font-medium">
                    <Check className="h-3 w-3" />
                    <span>{s}</span>
                  </span>
                ))}
                {scoreResult.missingRequiredSkills.map((s) => (
                  <span key={s} className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-800 px-2 py-0.5 text-[11px] font-medium">
                    <X className="h-3 w-3" />
                    <span>{s} (Missing)</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Description Section */}
        <div className="space-y-4 text-xs sm:text-sm text-neutral-700 leading-relaxed">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
              Role Overview
            </h2>
            <p className="whitespace-pre-line text-neutral-700">
              {job.description}
            </p>
          </div>

          {/* Key Responsibilities */}
          {job.responsibilities && job.responsibilities.length > 0 && (
            <div className="pt-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
                Responsibilities
              </h2>
              <ul className="space-y-2">
                {job.responsibilities.map((resp, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-neutral-700">
                    <CheckCircle2 className="h-4 w-4 text-neutral-900 shrink-0 mt-0.5" />
                    <span>{resp}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Required Skills */}
          {job.requiredSkills && job.requiredSkills.length > 0 && (
            <div className="pt-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
                Required Technical Skills
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {job.requiredSkills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-md bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
