import { ResumeUpload } from "@/components/upload/resume-upload";

export const metadata = {
  title: "Upload Resume — OneClick Jobs",
  description: "Upload and validate your PDF resume for skill matching in OneClick Jobs.",
};

export default function ResumePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 space-y-1">
        <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Candidate Matcher</span>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
          Upload Your Resume
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 max-w-xl">
          Preview automatic skill extraction and explainable match scores against Indian tech positions.
        </p>
      </div>

      <ResumeUpload />
    </div>
  );
}
