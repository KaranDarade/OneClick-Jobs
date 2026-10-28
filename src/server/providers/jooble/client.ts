import { z } from "zod";
import { Job } from "@/types/job";
import { normalizeJob } from "@/server/jobs/normalize";
import { MemoryCache } from "@/server/cache";

export const JoobleJobSchema = z.object({
  id: z.string().or(z.number()).transform((val) => String(val)),
  title: z.string(),
  location: z.string().optional().default("India"),
  snippet: z.string().optional().default(""),
  salary: z.string().optional().default(""),
  source: z.string().optional().default(""),
  type: z.string().optional().default(""),
  link: z.string(),
  company: z.string().optional().default("Confidential Tech Employer"),
  updated: z.string().optional(),
});

export const JoobleSearchResponseSchema = z.object({
  totalCount: z.number().optional().default(0),
  jobs: z.array(JoobleJobSchema),
});

export type JoobleJob = z.infer<typeof JoobleJobSchema>;

export interface JoobleSearchParams {
  q?: string;
  location?: string;
  page?: number;
}

export interface JoobleSearchResult {
  jobs: Job[];
  total: number;
  source: "live" | "demo-fallback" | "cache";
  error?: string;
}

const joobleSearchCache = new MemoryCache<JoobleSearchResult>(15 * 60 * 1000);
const joobleDetailCache = new MemoryCache<Job>(30 * 60 * 1000);

export class JoobleClient {
  private apiKey: string | null;
  private baseUrl: string;

  constructor(
    apiKey?: string,
    baseUrl: string = "https://jooble.org/api"
  ) {
    this.apiKey = apiKey || process.env.JOOBLE_API_KEY || null;
    this.baseUrl = baseUrl;
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  async search(params: JoobleSearchParams = {}): Promise<JoobleSearchResult> {
    if (!this.isConfigured()) {
      return {
        jobs: [],
        total: 0,
        source: "demo-fallback",
        error: "JOOBLE_API_KEY is not configured",
      };
    }

    const query = params.q || "software developer";
    const location = params.location && params.location !== "All India" ? params.location : "India";
    const cacheKey = `jooble_${query}_${location}_${params.page || 1}`;

    const cached = joobleSearchCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const url = `${this.baseUrl}/${this.apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          keywords: query,
          location: location,
          page: params.page || 1,
        }),
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) {
        return {
          jobs: [],
          total: 0,
          source: "demo-fallback",
          error: `Jooble API returned status ${res.status}`,
        };
      }

      const json = await res.json();
      const parsed = JoobleSearchResponseSchema.safeParse(json);
      if (!parsed.success) {
        return {
          jobs: [],
          total: 0,
          source: "demo-fallback",
          error: "Failed to parse Jooble response",
        };
      }

      const jobs: Job[] = [];

      for (const item of parsed.data.jobs) {
        const normResult = normalizeJob({
          id: `jooble:${item.id}`,
          providerId: "jooble",
          externalId: item.id,
          title: item.title.replace(/<\/?[^>]+(>|$)/g, ""),
          company: item.company,
          originalLocation: item.location,
          description: item.snippet.replace(/<\/?[^>]+(>|$)/g, ""),
          originalUrl: item.link,
          postedAt: item.updated || new Date().toISOString(),
          sourceAttribution: "Jooble Partner Network",
          providerMeta: {
            source: "jooble",
            type: item.type,
            salaryText: item.salary,
          },
        });

        if (normResult.success && normResult.job) {
          jobs.push(normResult.job);
          joobleDetailCache.set(item.id, normResult.job);
        }
      }

      const result: JoobleSearchResult = {
        jobs,
        total: parsed.data.totalCount || jobs.length,
        source: "live",
      };

      joobleSearchCache.set(cacheKey, result);
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
    return joobleDetailCache.get(externalId) || null;
  }
}
