"use client";

import { useState } from "react";
import { UploadCloud, FileCheck, AlertCircle, FileText, ArrowRight, Shield } from "lucide-react";
import Link from "next/link";

export function ResumeUpload() {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedSuccess, setUploadedSuccess] = useState(false);

  const MAX_SIZE_MB = 5;

  const validateAndSetFile = (selectedFile: File) => {
    setError(null);
    setUploadedSuccess(false);

    // File type validation: PDF only
    if (selectedFile.type !== "application/pdf" && !selectedFile.name.endsWith(".pdf")) {
      setError("Please upload a valid PDF document (.pdf format only).");
      return;
    }

    // Size validation
    if (selectedFile.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File size exceeds ${MAX_SIZE_MB}MB limit. Please upload a smaller resume.`);
      return;
    }

    setFile(selectedFile);
    setIsProcessing(true);

    // Simulate local client-side validation parsing delay
    setTimeout(() => {
      setIsProcessing(false);
      setUploadedSuccess(true);
    }, 1000);
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
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
      {/* JevJobs-Style Resume Drop Panel */}
      <div className="md:col-span-8 rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xs space-y-5">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
            Resume Document
          </h2>
          <span className="text-[11px] font-mono text-neutral-400">PDF • MAX 5MB</span>
        </div>

        {/* Drop Zone matching JevJobs drop-zone (dashed, centered upload icon) */}
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
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label="Upload PDF Resume"
          />

          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white border border-neutral-200 text-neutral-700 shadow-2xs mb-3">
            <UploadCloud className="h-6 w-6 text-blue-600" />
          </div>

          <strong className="text-sm font-semibold text-neutral-900">
            Drop your resume here, or <span className="text-blue-600 hover:underline">browse</span>
          </strong>
          <p className="mt-1 text-xs text-neutral-500">
            Standard PDF format recommended. Parsed client-side.
          </p>
        </div>

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
            <span>Validating document structure...</span>
          </div>
        )}

        {/* Success State */}
        {uploadedSuccess && file && (
          <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-700 text-white">
                  <FileCheck className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-neutral-900">{file.name}</p>
                  <p className="text-[11px] text-neutral-500">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB • PDF Validated
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-800">
                PARSED
              </span>
            </div>

            <div className="rounded-lg bg-white p-3 text-xs text-neutral-600 border border-emerald-100 space-y-1">
              <p className="font-medium text-neutral-800">Deterministic Skill Extraction (Phase 5 Preview)</p>
              <p className="text-[11px] text-neutral-500">
                Your resume will be matched deterministically against required job skills without hallucination or selling candidate data.
              </p>
            </div>

            <div className="pt-1 flex justify-end">
              <Link
                href="/jobs"
                className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800"
              >
                <span>View Job Matches</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* JevJobs-Style Steps Sidebar */}
      <div className="md:col-span-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xs space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
          How Matching Works
        </h3>
        <ol className="space-y-4 text-xs text-neutral-600">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 font-bold text-neutral-900 text-[11px]">
              1
            </span>
            <div>
              <strong className="text-neutral-900 block font-semibold">Upload PDF</strong>
              <p className="mt-0.5 text-neutral-500">Text is extracted cleanly using client-side parsing.</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 font-bold text-neutral-900 text-[11px]">
              2
            </span>
            <div>
              <strong className="text-neutral-900 block font-semibold">Skill Mapping</strong>
              <p className="mt-0.5 text-neutral-500">Identifies exact tech keywords and years of experience.</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 font-bold text-neutral-900 text-[11px]">
              3
            </span>
            <div>
              <strong className="text-neutral-900 block font-semibold">Explainable Score</strong>
              <p className="mt-0.5 text-neutral-500">Shows why a job fits and highlights missing prerequisites.</p>
            </div>
          </li>
        </ol>

        <div className="pt-3 border-t border-neutral-100 text-[11px] text-neutral-400 flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
          <span>Your data stays on your device. We never sell resumes.</span>
        </div>
      </div>
    </div>
  );
}
