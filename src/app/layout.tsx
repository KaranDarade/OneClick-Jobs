import { Suspense } from "react";
import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { CandidateProfileProvider } from "@/features/matching/useCandidateProfile";

export const metadata: Metadata = {
  title: {
    default: "OneClick Jobs — Less Searching. More Getting Hired.",
    template: "%s | OneClick Jobs",
  },
  description:
    "India-focused job discovery and matching platform. Find tech roles across Bengaluru, Mumbai, Pune, Hyderabad, and Delhi NCR with instant skill compatibility scoring.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://oneclickjobs.in"),
  keywords: [
    "Jobs in India",
    "Tech Jobs Bengaluru",
    "Software Engineer Jobs",
    "Remote Jobs India",
    "Resume Match Scoring",
    "OneClick Jobs",
  ],
  authors: [{ name: "OneClick Jobs Team" }],
  openGraph: {
    title: "OneClick Jobs — Less Searching. More Getting Hired.",
    description:
      "Search curated tech jobs across top Indian hubs with instant ATS matching and zero spam.",
    url: "https://oneclickjobs.in",
    siteName: "OneClick Jobs",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "OneClick Jobs",
    description: "Less Searching. More Getting Hired.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-[#fafafa] font-sans text-neutral-900">
        <CandidateProfileProvider>
          <Suspense fallback={<div className="h-14 border-b border-neutral-200 bg-white" />}>
            <Navbar />
          </Suspense>
          <main className="flex-1">{children}</main>
          <Footer />
        </CandidateProfileProvider>
      </body>
    </html>
  );
}
