"use client";

import { useState } from "react";
import { Job } from "@/types/job";
import { CompatibilityScoreResult } from "@/types/matching";
import { AIMatchAnalysis } from "@/types/ai";
import { useCandidateProfile } from "@/features/matching/useCandidateProfile";
import {
  Sparkles,
  Bot,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  CheckCircle,
  AlertCircle,
  FileText,
} from "lucide-react";

interface AIMatchAssistantProps {
  job: Job;
  breakdown?: CompatibilityScoreResult;
}

export function AIMatchAssistant({ job, breakdown }: AIMatchAssistantProps) {
  const { profile, hasProfile } = useCandidateProfile();
  const [analysis, setAnalysis] = useState<AIMatchAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const candidateSkills = profile ? (profile.userSkills.length > 0 ? profile.userSkills : profile.extractedSkills) : [];

  const fetchAnalysis = async () => {
    if (analysis) {
      setIsOpen(!isOpen);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/jobs/${encodeURIComponent(job.id)}/ai-analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate: {
            skills: candidateSkills,
            experienceYears: profile?.experienceYears ?? undefined,
            preferredArrangement: profile?.preferredArrangements?.[0] ?? undefined,
          },
          breakdown,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.analysis) {
          setAnalysis(data.analysis);
          setIsOpen(true);
        }
      }
    } catch (err) {
      console.error("Failed to load AI match analysis:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const copyCoverLetter = () => {
    if (!analysis?.coverLetterStarter) return;
    navigator.clipboard.writeText(analysis.coverLetterStarter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!hasProfile && candidateSkills.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 via-purple-50/30 to-white p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
              <span>Career Assistant & Tailored Insights</span>
              {analysis && (
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-700 normal-case">
                  {analysis.isAiGenerated ? "Gemini AI" : "Deterministic Engine"}
                </span>
              )}
            </h3>
            <p className="text-[11px] text-neutral-500">
              Personalized candidate fit analysis and customized application starter.
            </p>
          </div>
        </div>

        <button
          onClick={fetchAnalysis}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors cursor-pointer disabled:opacity-50"
        >
          {isLoading ? (
            <span className="inline-block animate-pulse">Analyzing...</span>
          ) : isOpen ? (
            <>
              <span>Collapse</span>
              <ChevronUp className="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              <span>{analysis ? "View Insights" : "Generate Match Insights"}</span>
            </>
          )}
        </button>
      </div>

      {/* Expanded Content Drawer */}
      {isOpen && analysis && (
        <div className="pt-2 border-t border-indigo-100/80 space-y-4 text-xs">
          {/* Fit Summary */}
          <div className="rounded-lg bg-white p-3 border border-indigo-100/60 shadow-xs">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
              Executive Fit Summary
            </h4>
            <p className="text-neutral-700 leading-relaxed font-normal">
              {analysis.fitSummary}
            </p>
          </div>

          {/* Strengths & Growth Areas Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Strengths */}
            <div className="rounded-lg bg-white p-3 border border-emerald-100 shadow-xs space-y-1.5">
              <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                <span>Key Candidate Strengths</span>
              </div>
              <ul className="space-y-1 text-neutral-600 pl-4 list-disc text-[11px]">
                {analysis.strengths.map((s, idx) => (
                  <li key={idx}>{s}</li>
                ))}
              </ul>
            </div>

            {/* Growth Areas */}
            <div className="rounded-lg bg-white p-3 border border-amber-100 shadow-xs space-y-1.5">
              <div className="flex items-center gap-1.5 text-amber-800 font-semibold">
                <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                <span>Areas to Highlight or Prepare</span>
              </div>
              <ul className="space-y-1 text-neutral-600 pl-4 list-disc text-[11px]">
                {analysis.growthAreas.map((g, idx) => (
                  <li key={idx}>{g}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Interview Tips */}
          {analysis.interviewTips.length > 0 && (
            <div className="rounded-lg bg-white p-3 border border-indigo-100/60 shadow-xs space-y-1.5">
              <div className="flex items-center gap-1.5 text-indigo-900 font-semibold">
                <Lightbulb className="h-3.5 w-3.5 text-indigo-600" />
                <span>Interview Preparation Talking Points</span>
              </div>
              <ul className="space-y-1 text-neutral-600 pl-4 list-disc text-[11px]">
                {analysis.interviewTips.map((tip, idx) => (
                  <li key={idx}>{tip}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Tailored Cover Letter Starter */}
          {analysis.coverLetterStarter && (
            <div className="rounded-lg bg-neutral-900 text-neutral-100 p-3.5 space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-white font-semibold">
                  <FileText className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Tailored Cover Letter Starter</span>
                </div>
                <button
                  onClick={copyCoverLetter}
                  className="inline-flex items-center gap-1 rounded bg-neutral-800 px-2 py-1 text-[11px] font-medium text-neutral-200 hover:bg-neutral-700 transition-colors cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copy Starter</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="whitespace-pre-wrap font-sans text-xs text-neutral-300 leading-relaxed bg-neutral-950/60 p-2.5 rounded border border-neutral-800">
                {analysis.coverLetterStarter}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
