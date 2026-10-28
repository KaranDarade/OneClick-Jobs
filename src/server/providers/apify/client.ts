import { z } from "zod";
import { Job } from "@/types/job";
import { normalizeJob } from "@/server/jobs/normalize";
import { MemoryCache } from "@/server/cache";

export const ApifyDatasetItemSchema = z.object({
  id: z.string().or(z.number()).optional(),
  title: z.string().optional(),
  position: z.string().optional(),
  company: z.string().optional(),
  companyName: z.string().optional(),
  location: z.string().optional(),
  url: z.string().optional(),
  jobUrl: z.string().optional(),
  description: z.string().optional().default(""),
  postedAt: z.string().optional(),
  date: z.string().optional(),
});

export type ApifyDatasetItem = z.infer<typeof ApifyDatasetItemSchema>;

export interface ApifySearchParams {
  q?: string;
  location?: string;
  datasetId?: string;
}

export interface ApifySearchResult {
  jobs: Job[];
  total: number;
  source: "live" | "demo-fallback" | "cache";
  error?: string;
}

const apifyCache = new MemoryCache<ApifySearchResult>(30 * 60 * 1000);
const apifyDetailCache = new MemoryCache<Job>(30 * 60 * 1000);

export class ApifyClient {
  private apiToken: string | null;
  private datasetId: string | null;
  private baseUrl: string;

  constructor(
    apiToken?: string,
    datasetId?: string,
    baseUrl: string = "https://api.apify.com/v2"
  ) {
    this.apiToken = apiToken || process.env.APIFY_API_TOKEN || null;
    this.datasetId = datasetId || process.env.APIFY_DEFAULT_DATASET_ID || null;
    this.baseUrl = baseUrl;
  }

  isConfigured(): boolean {
    return Boolean(this.apiToken && this.apiToken.trim().length > 0 && this.datasetId);
  }

  async search(params: ApifySearchParams = {}): Promise<ApifySearchResult> {
    const targetDatasetId = params.datasetId || this.datasetId;

    if (!this.apiToken || !targetDatasetId) {
      return {
        jobs: [],
        total: 0,
        source: "demo-fallback",
        error: "APIFY_API_TOKEN or APIFY_DEFAULT_DATASET_ID is not configured",
      };
    }

    const cacheKey = `apify_${targetDatasetId}_${params.q || "all"}`;
    const cached = apifyCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const url = `${this.baseUrl}/datasets/${encodeURIComponent(targetDatasetId)}/items?token=${this.apiToken}&limit=50`;
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) {
        return {
          jobs: [],
          total: 0,
          source: "demo-fallback",
          error: `Apify API returned status ${res.status}`,
        };
      }

      const json = await res.json();
      if (!Array.isArray(json)) {
        return {
          jobs: [],
          total: 0,
          source: "demo-fallback",
          error: "Invalid Apify dataset format",
        };
      }

      const jobs: Job[] = [];

      for (let i = 0; i < json.length; i++) {
        const item = json[i];
        const parsed = ApifyDatasetItemSchema.safeParse(item);
        if (!parsed.success) continue;

        const data = parsed.data;
        const jobTitle = data.title || data.position;
        const comp = data.company || data.companyName;
        if (!jobTitle || !comp) continue;

        const rawUrl = data.url || data.jobUrl || `https://apify.com/dataset/${targetDatasetId}/item/${i}`;
        const externalId = String(data.id || `apify-${i}`);

        const normResult = normalizeJob({
          id: `apify:${externalId}`,
          providerId: "apify",
          externalId,
          title: jobTitle,
          company: comp,
          originalLocation: data.location || "India",
          description: data.description || jobTitle,
          originalUrl: rawUrl,
          postedAt: data.postedAt || data.date || new Date().toISOString(),
          sourceAttribution: "Apify Aggregated Feed",
          providerMeta: {
            source: "apify",
            datasetId: targetDatasetId,
          },
        });

        if (normResult.success && normResult.job) {
          jobs.push(normResult.job);
          apifyDetailCache.set(externalId, normResult.job);
        }
      }

      const result: ApifySearchResult = {
        jobs,
        total: jobs.length,
        source: "live",
      };

      apifyCache.set(cacheKey, result);
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
    return apifyDetailCache.get(externalId) || null;
  }
}
