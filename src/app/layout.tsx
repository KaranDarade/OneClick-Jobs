import { Suspense } from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { CandidateProfileProvider } from "@/features/matching/useCandidateProfile";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OneClick Jobs — Less Searching. More Getting Hired.",
  description:
    "India-focused job discovery and matching platform. Find software engineering, tech support, and data roles across Bengaluru, Mumbai, Pune, Hyderabad, and Delhi NCR.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body
        className={`${geistSans.variable} ${geistMono.variable} flex min-h-full flex-col bg-[#fafafa] font-sans text-neutral-900`}
      >
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
