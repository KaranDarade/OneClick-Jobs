import { z } from "zod";
import { Job, WorkArrangement, ExperienceLevel } from "@/types/job";
import { normalizeJob } from "@/server/jobs/normalize";
import { MemoryCache } from "@/server/cache";

export const VETTED_ASHBY_COMPANIES = [
  { slug: "supabase", name: "Supabase" },
  { slug: "linear", name: "Linear" },
  { slug: "sentry", name: "Sentry" },
  { slug: "resend", name: "Resend" },
] as const;

export type AshbyCompanySlug = (typeof VETTED_ASHBY_COMPANIES)[number]["slug"];

export const AshbyJobItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  location: z.string().nullable().optional(),
  department: z.string().nullable().optional(),
  team: z.string().nullable().optional(),
  isRemote: z.boolean().nullable().optional(),
  publishedAt: z.string().nullable().optional(),
  jobUrl: z.string().optional(),
  applyUrl: z.string().optional(),
  descriptionHtml: z.string().nullable().optional(),
  descriptionPlain: z.string().nullable().optional(),
});

export const AshbyBoardResponseSchema = z.object({
  jobs: z.array(AshbyJobItemSchema),
});

export interface AshbySearchParams {
  q?: string;
  location?: string;
  days?: number;
}

const ashbyBoardCache = new MemoryCache<Job[]>(15 * 60 * 1000);
const ashbyDetailCache = new MemoryCache<Job>(30 * 60 * 1000);

export class AshbyClient {
  private baseUrl: string;

  constructor(baseUrl: string = "https://api.ashbyhq.com/posting-api") {
    this.baseUrl = baseUrl;
  }

  private isIndiaOrGlobalRemote(locationName: string | null | undefined, isRemote?: boolean | null): boolean {
    if (isRemote) {
      if (!locationName) return true;
      const lower = locationName.toLowerCase();
      // True if India or Global/Worldwide Remote
      return (
        lower.includes("india") ||
        lower.includes("global") ||
        lower.includes("worldwide") ||
        lower.includes("apac") ||
        lower.includes("anywhere") ||
        lower.includes("bengaluru") ||
        lower.includes("bangalore") ||
        lower.includes("remote")
      );
    }
    if (!locationName) return false;
    const lower = locationName.toLowerCase();
    return (
      lower.includes("india") ||
      lower.includes("bangalore") ||
      lower.includes("bengaluru") ||
      lower.includes("pune") ||
      lower.includes("hyderabad") ||
      lower.includes("gurgaon") ||
      lower.includes("gurugram") ||
      lower.includes("mumbai") ||
      lower.includes("delhi") ||
      lower.includes("noida")
    );
  }

  async fetchCompanyJobs(companySlug: string, companyDisplayName: string): Promise<Job[]> {
    const cacheKey = `ashby_board_${companySlug}`;
    const cached = ashbyBoardCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const url = `${this.baseUrl}/job-board/${encodeURIComponent(companySlug)}`;
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) {
        return [];
      }

      const json = await res.json();
      const parsed = AshbyBoardResponseSchema.safeParse(json);
      if (!parsed.success) {
        return [];
      }

      const jobs: Job[] = [];

      for (const item of parsed.data.jobs) {
        const isTarget = this.isIndiaOrGlobalRemote(item.location, item.isRemote);
        if (!isTarget) continue;

        const jobUrl = item.jobUrl || item.applyUrl || `https://jobs.ashbyhq.com/${companySlug}/${item.id}`;
        const loc = item.location || (item.isRemote ? "Remote (Global / India)" : "India");

        const normResult = normalizeJob({
          id: `ashby:${companySlug}-${item.id}`,
          providerId: "ashby",
          externalId: `${companySlug}-${item.id}`,
          title: item.title,
          company: companyDisplayName,
          originalLocation: loc,
          description: item.descriptionPlain || item.descriptionHtml || item.title,
          originalUrl: jobUrl,
          postedAt: item.publishedAt || new Date().toISOString(),
          sourceAttribution: `${companyDisplayName} (Ashby)`,
          workArrangement: item.isRemote ? "remote" : "on-site",
          providerMeta: {
            source: "ashby",
            isRemote: item.isRemote,
            department: item.department,
            team: item.team,
          },
        });

        if (normResult.success && normResult.job) {
          jobs.push(normResult.job);
        }
      }

      ashbyBoardCache.set(cacheKey, jobs);
      return jobs;
    } catch {
      return [];
    }
  }

  async search(params: AshbySearchParams = {}): Promise<Job[]> {
    const boardPromises = VETTED_ASHBY_COMPANIES.map((c) =>
      this.fetchCompanyJobs(c.slug, c.name)
    );

    const results = await Promise.allSettled(boardPromises);
    const allJobs: Job[] = [];

    for (const res of results) {
      if (res.status === "fulfilled") {
        allJobs.push(...res.value);
      }
    }

    return allJobs;
  }

  async getJobById(externalId: string): Promise<Job | null> {
    const cached = ashbyDetailCache.get(externalId);
    if (cached) {
      return cached;
    }

    // externalId format: "{companySlug}-{id}"
    const parts = externalId.split("-");
    if (parts.length < 2) return null;

    const companySlug = parts[0];
    const jobId = parts.slice(1).join("-");

    // Fetch the company board and find the job
    const matchedCompany = VETTED_ASHBY_COMPANIES.find((c) => c.slug === companySlug);
    const companyDisplayName = matchedCompany?.name || companySlug;
    const boardJobs = await this.fetchCompanyJobs(companySlug, companyDisplayName);

    const match = boardJobs.find((j) => j.externalId === externalId);
    if (match) {
      ashbyDetailCache.set(externalId, match);
      return match;
    }

    return null;
  }
}
