import { Suspense } from "react";
import { HomeCuratedExperience } from "@/components/home/home-curated-experience";

export const metadata = {
  title: "OneClick Jobs — Curated Software & Fresher Jobs in India",
  description:
    "Direct software engineering job discovery for freshers and experienced developers. 100% verified employer ATS applications with zero third-party login walls.",
};

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-5xl px-4 py-16 text-center text-xs text-neutral-400">
          Loading curated jobs...
        </div>
      }
    >
      <HomeCuratedExperience />
    </Suspense>
  );
}
