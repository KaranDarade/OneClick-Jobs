import { z } from "zod";
import { Job, WorkArrangement, ExperienceLevel } from "@/types/job";
import { normalizeJob } from "@/server/jobs/normalize";
import { MemoryCache } from "@/server/cache";

/**
 * Curated list of top tech employers with verified engineering & tech offices in India
 * using public Greenhouse job boards (keyless, ₹0 cost, structured JSON).
 */
export const VETTED_GREENHOUSE_COMPANIES = [
  { slug: "stripe", name: "Stripe" },
  { slug: "mongodb", name: "MongoDB" },
  { slug: "databricks", name: "Databricks" },
  { slug: "inmobi", name: "InMobi" },
  { slug: "rubrik", name: "Rubrik" },
  { slug: "okta", name: "Okta" },
  { slug: "elastic", name: "Elastic" },
  { slug: "twilio", name: "Twilio" },
  { slug: "coinbase", name: "Coinbase" },
] as const;

export type GreenhouseCompanySlug = (typeof VETTED_GREENHOUSE_COMPANIES)[number]["slug"];

/**
 * Greenhouse API schema definitions
 */
export const GreenhouseJobSummarySchema = z.object({
  id: z.number(),
  internal_job_id: z.number().nullable().optional(),
  title: z.string(),
  updated_at: z.string().nullable().optional(),
  first_published: z.string().nullable().optional(),
  absolute_url: z.string(),
  company_name: z.string().nullable().optional(),
  location: z
    .object({
      name: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  metadata: z.array(z.unknown()).nullable().optional(),
});

export const GreenhouseBoardResponseSchema = z.object({
  jobs: z.array(GreenhouseJobSummarySchema),
});

export const GreenhouseJobDetailSchema = GreenhouseJobSummarySchema.extend({
  content: z.string().nullable().optional(),
  departments: z
    .array(
      z.object({
        id: z.number().optional(),
        name: z.string().optional(),
      })
    )
    .nullable()
    .optional(),
  offices: z
    .array(
      z.object({
        id: z.number().optional(),
        name: z.string().optional(),
        location: z.string().nullable().optional(),
      })
    )
    .nullable()
    .optional(),
});

export type GreenhouseJobSummary = z.infer<typeof GreenhouseJobSummarySchema>;
export type GreenhouseJobDetail = z.infer<typeof GreenhouseJobDetailSchema>;

export interface GreenhouseSearchParams {
  q?: string;
  location?: string;
  days?: number;
}

// In-memory TTL cache for Greenhouse board responses (15 minutes)
const greenhouseBoardCache = new MemoryCache<Job[]>(15 * 60 * 1000);
const greenhouseDetailCache = new MemoryCache<Job>(30 * 60 * 1000);

export class GreenhouseClient {
  private baseUrl: string;

  constructor(baseUrl: string = "https://boards-api.greenhouse.io/v1") {
    this.baseUrl = baseUrl;
  }

  /**
   * Helper to check whether a location string belongs to India
   */
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

  /**
   * Helper to strip HTML tags for clean description text
   */
  private stripHtml(html: string | null | undefined): string {
    if (!html) return "";
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n\n")
      .replace(/<br\s*[\/]?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/[ \t]+/g, " ")
      .replace(/\n\s*\n/g, "\n\n")
      .trim();
  }

  /**
   * Fetch and normalize jobs for a specific company board
   */
  async fetchCompanyJobs(companySlug: string, companyDisplayName: string): Promise<Job[]> {
    const cacheKey = `gh_board_${companySlug}`;
    const cached = greenhouseBoardCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const url = `${this.baseUrl}/boards/${encodeURIComponent(companySlug)}/jobs`;
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) {
        return [];
      }

      const json = await res.json();
      const parsed = GreenhouseBoardResponseSchema.safeParse(json);
      if (!parsed.success) {
        return [];
      }

      const jobs: Job[] = [];
      for (const raw of parsed.data.jobs) {
        const locName = raw.location?.name || "";
        if (!this.isIndiaLocation(locName)) {
          continue; // Filter to India jobs only
        }

        const dateStr = raw.first_published || raw.updated_at || null;
        const normResult = normalizeJob({
          id: `greenhouse:${companySlug}-${raw.id}`,
          providerId: `greenhouse-${companySlug}`,
          externalId: `${companySlug}-${raw.id}`,
          title: raw.title,
          company: companyDisplayName || raw.company_name || companySlug,
          originalUrl: raw.absolute_url,
          sourceAttribution: `${companyDisplayName} (Greenhouse)`,
          originalLocation: locName || "India",
          description: `Direct posting from ${companyDisplayName} careers portal for ${raw.title}. View the official application page for full requirements and benefits.`,
          postedAt: dateStr,
          firstSeenAt: dateStr || new Date().toISOString(),
          lastSeenAt: dateStr || new Date().toISOString(),
          status: "active",
          isDemo: false,
          providerMeta: {
            ats: "greenhouse",
            companySlug,
            greenhouseId: raw.id,
          },
        });

        if (normResult.success && normResult.job) {
          jobs.push(normResult.job);
        }
      }

      greenhouseBoardCache.set(cacheKey, jobs);
      return jobs;
    } catch {
      return [];
    }
  }

  /**
   * Search across all pre-configured India tech employer boards
   */
  async search(params: GreenhouseSearchParams = {}): Promise<Job[]> {
    // Query all vetted company boards concurrently with individual failure isolation
    const boardPromises = VETTED_GREENHOUSE_COMPANIES.map((c) =>
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

  /**
   * Get single job details by composite ID (e.g., "stripe-8247127")
   */
  async getJobById(externalId: string): Promise<Job | null> {
    const cached = greenhouseDetailCache.get(externalId);
    if (cached) {
      return cached;
    }

    // externalId format: "{companySlug}-{id}"
    const parts = externalId.split("-");
    if (parts.length < 2) return null;

    const companySlug = parts[0];
    const jobId = parts.slice(1).join("-");
    const matchedCompany = VETTED_GREENHOUSE_COMPANIES.find((c) => c.slug === companySlug);
    const companyDisplayName = matchedCompany?.name || companySlug;

    try {
      const url = `${this.baseUrl}/boards/${encodeURIComponent(companySlug)}/jobs/${encodeURIComponent(jobId)}`;
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) {
        return null;
      }

      const json = await res.json();
      const parsed = GreenhouseJobDetailSchema.safeParse(json);
      if (!parsed.success) {
        return null;
      }

      const raw = parsed.data;
      const cleanDesc = this.stripHtml(raw.content);
      const dateStr = raw.first_published || raw.updated_at || null;

      const normResult = normalizeJob({
        id: `greenhouse:${externalId}`,
        providerId: `greenhouse-${companySlug}`,
        externalId: externalId,
        title: raw.title,
        company: companyDisplayName || raw.company_name || companySlug,
        originalUrl: raw.absolute_url,
        sourceAttribution: `${companyDisplayName} (Greenhouse)`,
        originalLocation: raw.location?.name || "India",
        description:
          cleanDesc ||
          `Open position for ${raw.title} at ${companyDisplayName}. Visit the official careers page for full details and direct application.`,
        postedAt: dateStr,
        firstSeenAt: dateStr || new Date().toISOString(),
        lastSeenAt: dateStr || new Date().toISOString(),
        status: "active",
        isDemo: false,
        providerMeta: {
          ats: "greenhouse",
          companySlug,
          greenhouseId: raw.id,
          departments: raw.departments?.map((d) => d.name).filter(Boolean),
          offices: raw.offices?.map((o) => o.name).filter(Boolean),
        },
      });

      if (!normResult.success || !normResult.job) {
        return null;
      }

      greenhouseDetailCache.set(externalId, normResult.job);
      return normResult.job;
    } catch {
      return null;
    }
  }
}
