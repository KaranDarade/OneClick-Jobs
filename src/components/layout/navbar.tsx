"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, Bookmark, FileText, Menu, X, ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { useSavedJobs } from "@/features/saved-jobs/useSavedJobs";

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { savedJobs } = useSavedJobs();

  const navLinks = [
    { href: "/jobs", label: "Job Search", icon: Briefcase },
    {
      href: "/saved",
      label: "Saved Jobs",
      icon: Bookmark,
      badge: savedJobs.length > 0 ? savedJobs.length : null,
    },
    { href: "/upload-resume", label: "Upload Resume", icon: FileText },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-200/80 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Row matching JevJobs topbar: bold wordmark + pill badge */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <img
              src="/icon.svg"
              alt="OneClick Jobs"
              className="h-7 w-7 rounded-lg shadow-xs group-hover:scale-105 transition-transform"
            />
            <div className="flex items-center gap-1.5">
              <span className="text-[19px] font-black tracking-tight text-neutral-900 group-hover:text-blue-600 transition-colors">
                OneClick
              </span>
              <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[11px] font-bold font-mono uppercase tracking-wider text-blue-600 border border-blue-100">
                JOBS
              </span>
            </div>
          </Link>

          {/* Minimal breadcrumb indicator */}
          <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-neutral-200 text-xs text-neutral-400">
            <span>India Tech Discovery</span>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex md:items-center md:gap-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || (link.href !== "/" && pathname?.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-neutral-900 text-white font-semibold"
                    : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{link.label}</span>
                {link.badge !== null && link.badge !== undefined && (
                  <span
                    className={`ml-1 inline-flex items-center rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                      isActive ? "bg-white text-neutral-900" : "bg-neutral-200 text-neutral-700"
                    }`}
                  >
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}

          <Link
            href="/jobs"
            className="ml-3 inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50 transition-colors"
          >
            <span>Live Feed</span>
            <ArrowUpRight className="h-3 w-3 text-neutral-400" />
          </Link>
        </nav>

        {/* Mobile menu trigger */}
        <div className="flex md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-neutral-700 hover:bg-neutral-100 focus:outline-none"
            aria-expanded={mobileMenuOpen}
          >
            <span className="sr-only">Toggle navigation menu</span>
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="border-b border-neutral-200 bg-white px-4 pt-2 pb-4 md:hidden">
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium ${
                    isActive
                      ? "bg-neutral-900 text-white"
                      : "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4" />
                    <span>{link.label}</span>
                  </div>
                  {link.badge !== null && link.badge !== undefined && (
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                        isActive ? "bg-white text-neutral-900" : "bg-neutral-100 text-neutral-700"
                      }`}
                    >
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
