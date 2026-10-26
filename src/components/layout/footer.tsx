import Link from "next/link";
import { MapPin, ShieldCheck } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-white text-neutral-600 text-xs">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-4">
          {/* Brand Info */}
          <div className="space-y-3 sm:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-base font-black tracking-tight text-neutral-900">OneClick</span>
              <span className="rounded-md bg-blue-50 px-1 py-0.2 text-[10px] font-bold font-mono uppercase text-blue-600 border border-blue-100">
                JOBS
              </span>
            </Link>
            <p className="text-neutral-500 leading-relaxed text-xs">
              Less Searching. More Getting Hired. Focused discovery for India tech professionals.
            </p>
            <div className="flex items-center gap-1.5 text-neutral-400 text-[11px]">
              <MapPin className="h-3 w-3 text-neutral-400" />
              <span>Bengaluru • Mumbai • Pune • NCR</span>
            </div>
          </div>

          {/* Hubs */}
          <div className="space-y-2">
            <h3 className="font-semibold text-neutral-900 uppercase tracking-wider text-[11px]">Tech Hubs</h3>
            <ul className="space-y-1.5 text-neutral-500">
              <li>
                <Link href="/jobs?location=Bengaluru" className="hover:text-neutral-900">
                  Jobs in Bengaluru
                </Link>
              </li>
              <li>
                <Link href="/jobs?location=Delhi%20NCR" className="hover:text-neutral-900">
                  Jobs in Delhi NCR
                </Link>
              </li>
              <li>
                <Link href="/jobs?location=Pune" className="hover:text-neutral-900">
                  Jobs in Pune
                </Link>
              </li>
              <li>
                <Link href="/jobs?location=Hyderabad" className="hover:text-neutral-900">
                  Jobs in Hyderabad
                </Link>
              </li>
              <li>
                <Link href="/jobs?arrangement=remote" className="hover:text-neutral-900">
                  Remote (India)
                </Link>
              </li>
            </ul>
          </div>

          {/* Tools */}
          <div className="space-y-2">
            <h3 className="font-semibold text-neutral-900 uppercase tracking-wider text-[11px]">Platform</h3>
            <ul className="space-y-1.5 text-neutral-500">
              <li>
                <Link href="/jobs" className="hover:text-neutral-900">
                  Explore Postings
                </Link>
              </li>
              <li>
                <Link href="/upload-resume" className="hover:text-neutral-900">
                  Resume Matcher
                </Link>
              </li>
              <li>
                <Link href="/saved" className="hover:text-neutral-900">
                  Saved Jobs
                </Link>
              </li>
            </ul>
          </div>

          {/* Transparency */}
          <div className="space-y-2">
            <h3 className="font-semibold text-neutral-900 uppercase tracking-wider text-[11px]">Transparency</h3>
            <div className="space-y-1 text-neutral-500 leading-relaxed">
              <p>
                OneClick Jobs surfaces direct-to-ATS links and verified syndication feeds.
              </p>
              <div className="pt-1 flex items-center gap-1.5 text-neutral-400 text-[11px]">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Zero data selling. ₹0 candidate fees.</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-neutral-400 text-[11px]">
          <p>&copy; 2026 OneClick Jobs. Built with Next.js & Tailwind CSS.</p>
          <div className="flex gap-4">
            <Link href="/jobs" className="hover:text-neutral-600">Privacy & Terms</Link>
            <Link href="/jobs" className="hover:text-neutral-600">Feedback</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
