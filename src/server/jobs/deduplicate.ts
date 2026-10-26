import { Job } from "@/types/job";

export interface DeduplicationReport {
  uniqueJobs: Job[];
  duplicateCount: number;
  mergedDetails: {
    keptJobId: string;
    duplicateJobId: string;
    reason: string;
  }[];
}

/**
 * Canonicalizes a job URL by removing UTM tracking parameters, hash fragments, and trailing slashes.
 */
export function canonicalizeUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    // Strip common tracking parameters
    const paramsToStrip = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "ref",
      "gh_src",
      "lever-source",
      "source",
    ];
    paramsToStrip.forEach((p) => parsed.searchParams.delete(p));

    let clean = parsed.origin + parsed.pathname;
    if (clean.endsWith("/") && clean.length > parsed.origin.length + 1) {
      clean = clean.slice(0, -1);
    }
    const remainingParams = parsed.searchParams.toString();
    return remainingParams ? `${clean}?${remainingParams}` : clean;
  } catch {
    return rawUrl.trim().toLowerCase();
  }
}

/**
 * Normalizes text for conservative similarity matching.
 */
function cleanStringForMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Deduplication Engine
 *
 * Checks in order:
 * 1. Exact provider ID + external ID
 * 2. Canonicalized original URL
 * 3. Exact normalized company + normalized title + normalized city
 */
export function deduplicateJobs(jobs: Job[]): DeduplicationReport {
  const uniqueJobs: Job[] = [];
  const mergedDetails: DeduplicationReport["mergedDetails"] = [];

  const seenProviderExternalIds = new Set<string>();
  const seenUrls = new Map<string, Job>();
  const seenCompanyTitleLocation = new Map<string, Job>();

  for (const job of jobs) {
    // Check 1: Provider ID + External ID
    const providerExternalKey = `${job.providerId}:${job.externalId}`.toLowerCase();
    if (seenProviderExternalIds.has(providerExternalKey)) {
      mergedDetails.push({
        keptJobId: providerExternalKey,
        duplicateJobId: job.id,
        reason: "Duplicate provider ID and external ID",
      });
      continue;
    }

    // Check 2: Canonical URL
    const canonicalUrl = canonicalizeUrl(job.originalUrl);
    if (seenUrls.has(canonicalUrl)) {
      const existing = seenUrls.get(canonicalUrl)!;
      mergedDetails.push({
        keptJobId: existing.id,
        duplicateJobId: job.id,
        reason: `Duplicate canonical job URL: ${canonicalUrl}`,
      });
      continue;
    }

    // Check 3: Strict Company + Title + Location
    const companyKey = cleanStringForMatch(job.company);
    const titleKey = cleanStringForMatch(job.title);
    const cityKey = cleanStringForMatch(job.normalizedCity || job.originalLocation || "unknown");
    const compositeKey = `${companyKey}::${titleKey}::${cityKey}`;

    if (seenCompanyTitleLocation.has(compositeKey)) {
      const existing = seenCompanyTitleLocation.get(compositeKey)!;
      mergedDetails.push({
        keptJobId: existing.id,
        duplicateJobId: job.id,
        reason: `Duplicate company, title, and location (${job.company} - ${job.title})`,
      });
      continue;
    }

    // If passed all checks, retain as unique job
    seenProviderExternalIds.add(providerExternalKey);
    seenUrls.set(canonicalUrl, job);
    seenCompanyTitleLocation.set(compositeKey, job);
    uniqueJobs.push(job);
  }

  return {
    uniqueJobs,
    duplicateCount: mergedDetails.length,
    mergedDetails,
  };
}
