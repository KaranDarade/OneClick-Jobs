import Link from "next/link";
import {
  ArrowRight,
  Search,
  MapPin,
  Laptop,
  CheckCircle2,
  FileCheck,
  Building,
  Sparkles,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { POPULAR_INDIAN_CITIES } from "@/features/job-search/fixtures";

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* JevJobs-style Page Hero */}
      <section className="relative overflow-hidden border-b border-neutral-200 bg-white py-14 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-8">
            <div className="max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50/70 px-3 py-1 text-xs font-semibold text-blue-700">
                <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
                <span>Job Discovery for India Tech</span>
              </div>

              <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 sm:text-5xl sm:leading-[1.15]">
                Less Searching. <br />
                <span className="text-blue-600">More Getting Hired.</span>
              </h1>

              <p className="text-base text-neutral-600 sm:text-lg leading-relaxed">
                Discover verified tech roles across Bengaluru, Mumbai, Delhi NCR, Pune, and Hyderabad. Powered by canonical location normalization and transparent deduplication.
              </p>

              {/* JevJobs-style quick search box */}
              <div className="pt-2">
                <form
                  action="/jobs"
                  method="GET"
                  className="flex flex-col sm:flex-row items-center gap-2 rounded-2xl border border-neutral-200 bg-white p-2 shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100"
                >
                  <div className="flex flex-1 items-center gap-2.5 px-3 w-full">
                    <Search className="h-4 w-4 text-neutral-400 shrink-0" />
                    <input
                      name="q"
                      type="text"
                      placeholder="Role, tech stack (React, Python), or company..."
                      className="w-full text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none bg-transparent py-1.5"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-full bg-neutral-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-neutral-800 transition-colors shrink-0"
                  >
                    <span>Search Jobs</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </form>
                <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-neutral-400 px-1">
                  <span>Popular:</span>
                  <Link href="/jobs?q=Frontend" className="text-neutral-600 hover:text-neutral-900 underline underline-offset-2">Frontend</Link>
                  <span>•</span>
                  <Link href="/jobs?q=Backend" className="text-neutral-600 hover:text-neutral-900 underline underline-offset-2">Backend</Link>
                  <span>•</span>
                  <Link href="/jobs?q=DevOps" className="text-neutral-600 hover:text-neutral-900 underline underline-offset-2">DevOps</Link>
                  <span>•</span>
                  <Link href="/jobs?arrangement=remote" className="text-neutral-600 hover:text-neutral-900 underline underline-offset-2">Remote India</Link>
                </div>
              </div>
            </div>

            {/* Right side minimal metric card inspired by JevJobs */}
            <div className="hidden lg:flex flex-col gap-3 w-72 shrink-0">
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50/80 p-5 space-y-3">
                <div className="flex items-center justify-between text-xs text-neutral-500">
                  <span className="font-semibold text-neutral-900">Coverage Snapshot</span>
                  <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 font-mono text-[10px] font-bold">LIVE</span>
                </div>
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-500">Curated Indian Hubs</span>
                    <strong className="text-neutral-900 font-semibold">21+ Cities</strong>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-500">Upstream Deduplication</span>
                    <strong className="text-neutral-900 font-semibold">3-Tier Canonical</strong>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-500">Provider Cache TTL</span>
                    <strong className="text-neutral-900 font-semibold">15 Minutes</strong>
                  </div>
                </div>
                <div className="pt-2 border-t border-neutral-200/70">
                  <Link
                    href="/upload-resume"
                    className="inline-flex items-center justify-center w-full gap-1 rounded-full bg-white border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors shadow-2xs"
                  >
                    <FileCheck className="h-3.5 w-3.5 text-blue-600" />
                    <span>Test Resume Matcher</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Cities Row */}
      <section className="border-b border-neutral-200 bg-white py-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Explore by Indian Tech Hub
            </h2>
            <Link
              href="/jobs"
              className="text-xs font-medium text-blue-600 hover:underline flex items-center gap-1"
            >
              <span>All cities</span>
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
            {POPULAR_INDIAN_CITIES.filter((c) => c !== "All India").map((city) => (
              <Link
                key={city}
                href={`/jobs?location=${encodeURIComponent(city)}`}
                className="group flex flex-col justify-between rounded-xl border border-neutral-200 bg-white p-3 hover:border-neutral-400 hover:bg-neutral-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <MapPin className="h-3.5 w-3.5 text-neutral-400 group-hover:text-blue-600" />
                  <span className="text-[10px] font-mono text-neutral-400">IN</span>
                </div>
                <span className="mt-2 text-xs font-semibold text-neutral-900 group-hover:text-blue-600 truncate">
                  {city}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Value Pillars in JevJobs Minimal Card Style */}
      <section className="py-14 sm:py-20 bg-[#fafafa]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Core Architecture</span>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
              Engineered for signal, not clicks.
            </h2>
            <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
              Standard job boards inundate candidates with duplicate postings and broken remote claims. OneClick Jobs standardizes postings before you read them.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-900 font-bold text-sm">
                01
              </div>
              <h3 className="text-base font-semibold text-neutral-900">
                Centralized City Aliases
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Bengaluru matches Bangalore. Gurugram matches Gurgaon. Delhi NCR groups Noida, Greater Noida, and Gurgaon cleanly.
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-900 font-bold text-sm">
                02
              </div>
              <h3 className="text-base font-semibold text-neutral-900">
                Skill Boundary Isolation
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Word boundary matching guarantees searches for &ldquo;Java&rdquo; never falsely trigger on &ldquo;JavaScript&rdquo;, and &ldquo;SQL&rdquo; does not match &ldquo;PostgreSQL&rdquo;.
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-900 font-bold text-sm">
                03
              </div>
              <h3 className="text-base font-semibold text-neutral-900">
                Multi-Provider Deduplication
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Collapses identical vacancies cross-posted across boards using canonical URLs and normalized company-title-city keys.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Clean Bottom Banner */}
      <section className="border-t border-neutral-200 bg-neutral-900 py-12 text-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
          <div>
            <h2 className="text-xl font-bold">Ready to find your next career move?</h2>
            <p className="mt-1 text-xs text-neutral-400">
              Browse dozens of curated tech opportunities right now.
            </p>
          </div>
          <Link
            href="/jobs"
            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs font-bold text-neutral-900 hover:bg-neutral-100 transition-colors"
          >
            <span>Start Searching Jobs</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
