"use client";

import { useState } from "react";
import {
  UploadCloud,
  FileCheck,
  AlertCircle,
  ArrowRight,
  Shield,
  Trash2,
  Plus,
  X,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useCandidateProfile } from "@/features/matching/useCandidateProfile";

export function ResumeUpload() {
  const { profile, setProfile, clearProfile, addUserSkill, removeUserSkill } = useCandidateProfile();

  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [customSkillInput, setCustomSkillInput] = useState("");

  const MAX_SIZE_MB = 5;

  const handleUploadFile = async (selectedFile: File) => {
    setError(null);

    // 1. File type validation
    if (
      selectedFile.type !== "application/pdf" &&
      !selectedFile.name.toLowerCase().endsWith(".pdf")
    ) {
      setError("Please upload a valid PDF document (.pdf format only).");
      return;
    }

    // 2. Size validation
    if (selectedFile.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File size exceeds ${MAX_SIZE_MB}MB limit. Please upload a smaller resume.`);
      return;
    }

    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

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
      const msg = err instanceof Error ? err.message : "Error uploading resume";
      setError(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUploadFile(e.target.files[0]);
    }
  };

  const handleAddCustomSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (customSkillInput.trim()) {
      addUserSkill(customSkillInput.trim());
      setCustomSkillInput("");
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
      {/* Resume Drop and Extracted Profile Panel */}
      <div className="md:col-span-8 rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xs space-y-5">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
            Resume Profile
          </h2>
          {profile && (
            <button
              type="button"
              onClick={clearProfile}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-red-600 hover:text-red-700 transition-colors"
            >
              <Trash2 className="h-3 w-3" />
              <span>Clear Profile</span>
            </button>
          )}
        </div>

        {/* Upload Drop Zone */}
        {!profile ? (
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`relative flex flex-col items-center justify-center rounded-xl border border-dashed py-14 px-6 text-center transition-all ${
              dragActive
                ? "border-blue-500 bg-blue-50/50"
                : "border-neutral-300 bg-[#f7f7f8] hover:bg-neutral-100/60"
            }`}
          >
            <input
              id="resume-file-input"
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleInputChange}
              disabled={isProcessing}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
              aria-label="Upload PDF Resume"
            />

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white border border-neutral-200 text-neutral-700 shadow-2xs mb-3">
              <UploadCloud className="h-6 w-6 text-blue-600" />
            </div>

            <strong className="text-sm font-semibold text-neutral-900">
              Drop your resume here, or <span className="text-blue-600 hover:underline">browse</span>
            </strong>
            <p className="mt-1 text-xs text-neutral-500">
              Text-based PDF up to 5MB. Evaluated client/server memory with zero persistence.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Active Profile Header */}
            <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-700 text-white">
                  <FileCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-neutral-900">
                    {profile.fileName || "Candidate Resume"}
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    {profile.experienceYears !== null
                      ? `Detected ~${profile.experienceYears} yrs total experience • ${profile.userSkills?.length || 0} technical skills`
                      : `${profile.userSkills?.length || 0} technical skills detected`}
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-800">
                ACTIVE
              </span>
            </div>

            {/* Warnings Alert if any */}
            {profile.parsingWarnings && profile.parsingWarnings.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 space-y-1 text-xs text-amber-900">
                <strong className="block font-semibold">Parsing Notice:</strong>
                {profile.parsingWarnings.map((w, i) => (
                  <p key={i} className="text-[11px] text-amber-800">
                    • {w}
                  </p>
                ))}
              </div>
            )}

            {/* Candidate Skills Editor */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-700">
                  Extracted Technical Skills ({profile.userSkills?.length || 0})
                </span>
                <span className="text-[11px] text-neutral-400">
                  Click &times; to remove false positives
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {(profile.userSkills || []).map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-800 border border-neutral-200"
                  >
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() => removeUserSkill(skill)}
                      className="text-neutral-400 hover:text-neutral-700 rounded-xs"
                      aria-label={`Remove ${skill}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>

              {/* Add Custom Skill Form */}
              <form onSubmit={handleAddCustomSkill} className="flex gap-2 pt-2">
                <input
                  type="text"
                  placeholder="Add missing skill (e.g., Docker, GraphQL)..."
                  value={customSkillInput}
                  onChange={(e) => setCustomSkillInput(e.target.value)}
                  className="flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add</span>
                </button>
              </form>
            </div>

            {/* CTA to live job search with scores */}
            <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
              <span className="text-xs text-neutral-500">
                Rule-based scores will automatically appear on all job listings.
              </span>
              <Link
                href="/jobs"
                className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5 text-blue-400" />
                <span>Explore Ranked Jobs</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* Error Feedback */}
        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Processing State */}
        {isProcessing && (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-neutral-100 p-3 text-xs text-neutral-700">
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
            <span>Extracting technical skills and validating document...</span>
          </div>
        )}
      </div>

      {/* Right Steps & Privacy Sidebar */}
      <div className="md:col-span-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xs space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
          Deterministic Matching
        </h3>
        <ol className="space-y-4 text-xs text-neutral-600">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 font-bold text-neutral-900 text-[11px]">
              1
            </span>
            <div>
              <strong className="text-neutral-900 block font-semibold">Strict Privacy</strong>
              <p className="mt-0.5 text-neutral-500">
                Your resume is parsed in transient memory. We never persist the original PDF file, track personal contacts, or sell candidate data.
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 font-bold text-neutral-900 text-[11px]">
              2
            </span>
            <div>
              <strong className="text-neutral-900 block font-semibold">Boundary Skill Mapping</strong>
              <p className="mt-0.5 text-neutral-500">
                Word boundary matching isolates Java from JavaScript, SQL from PostgreSQL, and React from React Native.
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 font-bold text-neutral-900 text-[11px]">
              3
            </span>
            <div>
              <strong className="text-neutral-900 block font-semibold">Deterministic 0–100 Formula</strong>
              <p className="mt-0.5 text-neutral-500">
                Weights: Required skills (50%), Preferred skills (20%), Experience alignment (20%), and Work model (10%).
              </p>
            </div>
          </li>
        </ol>

        <div className="pt-3 border-t border-neutral-100 text-[11px] text-neutral-400 flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
          <span>Rule-based compatibility. No probabilistic AI hallucinations.</span>
        </div>
      </div>
    </div>
  );
}
