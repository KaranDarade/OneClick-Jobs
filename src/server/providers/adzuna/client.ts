import { z } from "zod";
import { Job, WorkArrangement, ExperienceLevel } from "@/types/job";
import { normalizeJob } from "@/server/jobs/normalize";
import { MemoryCache } from "@/server/cache";

export const AdzunaJobSchema = z.object({
  id: z.string().or(z.number()).transform((val) => String(val)),
  title: z.string(),
  description: z.string().optional().default(""),
  redirect_url: z.string(),
  created: z.string().optional(),
  salary_min: z.number().nullable().optional(),
  salary_max: z.number().nullable().optional(),
  company: z
    .object({
      display_name: z.string().optional(),
    })
    .optional(),
  location: z
    .object({
      display_name: z.string().optional(),
      area: z.array(z.string()).optional(),
    })
    .optional(),
  category: z
    .object({
      label: z.string().optional(),
      tag: z.string().optional(),
    })
    .optional(),
});

export const AdzunaSearchResponseSchema = z.object({
  results: z.array(AdzunaJobSchema),
  count: z.number().optional(),
});

export type AdzunaJob = z.infer<typeof AdzunaJobSchema>;

export interface AdzunaSearchParams {
  q?: string;
  location?: string;
  page?: number;
  resultsPerPage?: number;
}

export interface AdzunaSearchResult {
  jobs: Job[];
  total: number;
  source: "live" | "demo-fallback" | "cache";
  error?: string;
}

const adzunaSearchCache = new MemoryCache<AdzunaSearchResult>(15 * 60 * 1000);
const adzunaDetailCache = new MemoryCache<Job>(30 * 60 * 1000);

export class AdzunaClient {
  private appId: string | null;
  private appKey: string | null;
  private country: string;
  private baseUrl: string;

  constructor(
    appId?: string,
    appKey?: string,
    country: string = "in",
    baseUrl: string = "https://api.adzuna.com/v1/api"
  ) {
    this.appId = appId || process.env.ADZUNA_APP_ID || null;
    this.appKey = appKey || process.env.ADZUNA_APP_KEY || null;
    this.country = country;
    this.baseUrl = baseUrl;
  }

  isConfigured(): boolean {
    return Boolean(
      this.appId &&
      this.appId.trim().length > 0 &&
      this.appKey &&
      this.appKey.trim().length > 0
    );
  }

  async search(params: AdzunaSearchParams = {}): Promise<AdzunaSearchResult> {
    if (!this.isConfigured()) {
      return {
        jobs: [],
        total: 0,
        source: "demo-fallback",
        error: "ADZUNA_APP_ID or ADZUNA_APP_KEY is not configured",
      };
    }

    const page = params.page || 1;
    const resultsPerPage = params.resultsPerPage || 20;
    const query = params.q || "developer";
    const cacheKey = `adzuna_${query}_${params.location || "in"}_${page}`;

    const cached = adzunaSearchCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const url = new URL(`${this.baseUrl}/jobs/${this.country}/search/${page}`);
      url.searchParams.set("app_id", this.appId!);
      url.searchParams.set("app_key", this.appKey!);
      url.searchParams.set("results_per_page", String(resultsPerPage));
      url.searchParams.set("what", query);
      if (params.location && params.location !== "All India") {
        url.searchParams.set("where", params.location);
      }

      const res = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) {
        return {
          jobs: [],
          total: 0,
          source: "demo-fallback",
          error: `Adzuna API returned status ${res.status}`,
        };
      }

      const json = await res.json();
      const parsed = AdzunaSearchResponseSchema.safeParse(json);
      if (!parsed.success) {
        return {
          jobs: [],
          total: 0,
          source: "demo-fallback",
          error: "Failed to parse Adzuna response",
        };
      }

      const jobs: Job[] = [];

      for (const item of parsed.data.results) {
        const companyName = item.company?.display_name || "Confidential Tech Employer";
        const loc = item.location?.display_name || "India";

        const normResult = normalizeJob({
          id: `adzuna:${item.id}`,
          providerId: "adzuna",
          externalId: item.id,
          title: item.title.replace(/<\/?[^>]+(>|$)/g, ""),
          company: companyName,
          originalLocation: loc,
          description: item.description,
          originalUrl: item.redirect_url,
          postedAt: item.created || new Date().toISOString(),
          sourceAttribution: "Adzuna India",
          salaryMin: item.salary_min || undefined,
          salaryMax: item.salary_max || undefined,
          salaryCurrency: "INR",
          providerMeta: {
            source: "adzuna",
            category: item.category?.label,
          },
        });

        if (normResult.success && normResult.job) {
          jobs.push(normResult.job);
          adzunaDetailCache.set(item.id, normResult.job);
        }
      }

      const result: AdzunaSearchResult = {
        jobs,
        total: parsed.data.count || jobs.length,
        source: "live",
      };

      adzunaSearchCache.set(cacheKey, result);
      return result;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        jobs: [],
        total: 0,
        source: "demo-fallback",
        error: errorMsg,
      };
    }
  }

  async getJobById(externalId: string): Promise<Job | null> {
    return adzunaDetailCache.get(externalId) || null;
  }
}
