import { z } from "zod";
import { Job, WorkArrangement, ExperienceLevel } from "@/types/job";
import { normalizeJob } from "@/server/jobs/normalize";
import { MemoryCache } from "@/server/cache";

/**
 * Curated list of top tech employers using public Lever job boards
 * (Keyless, ₹0 cost, structured JSON, direct ATS postings in India).
 */
export const VETTED_LEVER_COMPANIES = [
  { slug: "paytm", name: "Paytm" },
  { slug: "meesho", name: "Meesho" },
  { slug: "cred", name: "CRED" },
] as const;

export type LeverCompanySlug = (typeof VETTED_LEVER_COMPANIES)[number]["slug"];

export const LeverPostingCategorySchema = z.object({
  commitment: z.string().nullable().optional(),
  department: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  team: z.string().nullable().optional(),
  allLocations: z.array(z.string()).nullable().optional(),
});

export const LeverPostingSchema = z.object({
  id: z.string(),
  text: z.string(),
  createdAt: z.number().nullable().optional(), // timestamp ms
  description: z.string().nullable().optional(),
  descriptionPlain: z.string().nullable().optional(),
  hostedUrl: z.string(),
  applyUrl: z.string().nullable().optional(),
  categories: LeverPostingCategorySchema.nullable().optional(),
  workplaceType: z.string().nullable().optional(), // 'remote', 'onsite', 'hybrid'
});

export type LeverPosting = z.infer<typeof LeverPostingSchema>;

export interface LeverSearchParams {
  q?: string;
  location?: string;
  days?: number;
}

const leverBoardCache = new MemoryCache<Job[]>(15 * 60 * 1000);
const leverDetailCache = new MemoryCache<Job>(30 * 60 * 1000);

export class LeverClient {
  private baseUrl: string;

  constructor(baseUrl: string = "https://api.lever.co/v0") {
    this.baseUrl = baseUrl;
  }

  private isIndiaLocation(locationName: string | null | undefined): boolean {
    if (!locationName) return false;
    const lower = locationName.toLowerCase();
    return (
      lower.includes("india") ||
      lower.includes("bangalore") ||
      lower.includes("bengaluru") ||
      lower.includes("gurgaon") ||
      lower.includes("gurugram") ||
      lower.includes("pune") ||
      lower.includes("hyderabad") ||
      lower.includes("mumbai") ||
      lower.includes("noida") ||
      lower.includes("delhi") ||
      lower.includes("chennai") ||
      lower.includes("kolkata") ||
      lower.includes("ahmedabad")
    );
  }

  async fetchCompanyJobs(companySlug: string, companyDisplayName: string): Promise<Job[]> {
    const cacheKey = `lever_board_${companySlug}`;
    const cached = leverBoardCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const url = `${this.baseUrl}/postings/${encodeURIComponent(companySlug)}?mode=json`;
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) {
        return [];
      }

      const json = await res.json();
      if (!Array.isArray(json)) {
        return [];
      }

      const jobs: Job[] = [];

      for (const item of json) {
        const parsed = LeverPostingSchema.safeParse(item);
        if (!parsed.success) continue;

        const p = parsed.data;
        const loc = p.categories?.location || "";
        const allLocs = (p.categories?.allLocations || []).join(", ");
        const fullLocString = `${loc} ${allLocs}`.trim();

        const isIndia = this.isIndiaLocation(fullLocString);
        const isRemoteExplicit = p.workplaceType === "remote" || loc.toLowerCase().includes("remote");

        // Keep jobs located in India or explicitly remote from these Indian tech employers
        if (!isIndia && !isRemoteExplicit) {
          continue;
        }

        let arrangement: WorkArrangement = "unknown";
        if (p.workplaceType === "remote" || loc.toLowerCase().includes("remote")) {
          arrangement = "remote";
        } else if (p.workplaceType === "hybrid" || loc.toLowerCase().includes("hybrid")) {
          arrangement = "hybrid";
        } else if (p.workplaceType === "onsite" || isIndia) {
          arrangement = "on-site";
        }

        const normResult = normalizeJob({
          id: `lever:${companySlug}-${p.id}`,
          providerId: "lever",
          externalId: `${companySlug}-${p.id}`,
          title: p.text,
          company: companyDisplayName,
          originalLocation: fullLocString || (isRemoteExplicit ? "Remote, India" : "India"),
          description: p.descriptionPlain || p.description || p.text,
          originalUrl: p.hostedUrl,
          postedAt: p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString(),
          sourceAttribution: `${companyDisplayName} (Lever)`,
          workArrangement: arrangement,
          providerMeta: {
            source: "lever",
            applyUrl: p.applyUrl,
            workplaceType: p.workplaceType,
            categories: p.categories,
          },
        });

        if (normResult.success && normResult.job) {
          jobs.push(normResult.job);
        }
      }

      leverBoardCache.set(cacheKey, jobs);
      return jobs;
    } catch {
      return [];
    }
  }

  async search(params: LeverSearchParams = {}): Promise<Job[]> {
    const boardPromises = VETTED_LEVER_COMPANIES.map((c) =>
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
    const cached = leverDetailCache.get(externalId);
    if (cached) {
      return cached;
    }

    // externalId format: "{companySlug}-{id}"
    const parts = externalId.split("-");
    if (parts.length < 2) return null;

    const companySlug = parts[0];
    const postingId = parts.slice(1).join("-");
    const matchedCompany = VETTED_LEVER_COMPANIES.find((c) => c.slug === companySlug);
    const companyDisplayName = matchedCompany?.name || companySlug;

    try {
      const url = `${this.baseUrl}/postings/${encodeURIComponent(companySlug)}/${encodeURIComponent(postingId)}`;
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) {
        return null;
      }

      const json = await res.json();
      const parsed = LeverPostingSchema.safeParse(json);
      if (!parsed.success) return null;

      const p = parsed.data;
      const loc = p.categories?.location || "";
      const isRemoteExplicit = p.workplaceType === "remote" || loc.toLowerCase().includes("remote");

      const normResult = normalizeJob({
        id: `lever:${companySlug}-${p.id}`,
        providerId: `lever-${companySlug}`,
        externalId: `${companySlug}-${p.id}`,
        title: p.text,
        company: companyDisplayName,
        originalLocation: loc || (isRemoteExplicit ? "Remote, India" : "India"),
        description: p.descriptionPlain || p.description || p.text,
        originalUrl: p.hostedUrl,
        postedAt: p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString(),
        sourceAttribution: `${companyDisplayName} (Lever)`,
        workArrangement: isRemoteExplicit ? "remote" : "on-site",
        providerMeta: {
          source: "lever",
          applyUrl: p.applyUrl,
          workplaceType: p.workplaceType,
          categories: p.categories,
        },
      });

      if (normResult.success && normResult.job) {
        leverDetailCache.set(externalId, normResult.job);
        return normResult.job;
      }

      return null;
    } catch {
      return null;
    }
  }
}
