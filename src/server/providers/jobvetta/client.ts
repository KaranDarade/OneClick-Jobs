import { z } from "zod";
import { Job } from "@/types/job";
import { normalizeJob } from "@/server/jobs/normalize";
import { MemoryCache } from "@/server/cache";

/**
 * Jobvetta API Response Schemas
 */
export const JobvettaSummarySchema = z.object({
  job_id: z.string(),
  title: z.string(),
  company: z.string(),
  location: z.string(),
  work_model: z.string().nullable().optional(),
  employment_type: z.string().nullable().optional(),
  salary: z.unknown().optional(),
  url: z.string(),
});

export const JobvettaSearchResponseSchema = z.object({
  total: z.number(),
  jobs: z.array(JobvettaSummarySchema),
});

export const JobvettaDetailSchema = z.object({
  job_id: z.string(),
  title: z.string(),
  normalized_title: z.string().nullable().optional(),
  company: z.string(),
  location: z.string(),
  description: z.string().default(""),
  work_model: z.string().nullable().optional(),
  employment_type: z.string().nullable().optional(),
  experience_level: z.string().nullable().optional(),
  minimum_qualifications: z.array(z.string()).nullable().optional(),
  skills_required: z.array(z.string()).nullable().optional(),
  responsibilities: z.array(z.string()).nullable().optional(),
  salary_min: z.number().nullable().optional(),
  salary_max: z.number().nullable().optional(),
  salary_currency: z.string().nullable().optional(),
  created_at: z.number().nullable().optional(), // Unix seconds
  last_seen_date: z.number().nullable().optional(), // Unix seconds
  url: z.string(),
});

export type JobvettaSummary = z.infer<typeof JobvettaSummarySchema>;
export type JobvettaDetail = z.infer<typeof JobvettaDetailSchema>;

export interface JobvettaSearchParams {
  q?: string;
  location?: string;
  days?: number;
  limit?: number;
}

export interface JobvettaSearchResult {
  jobs: Job[];
  total: number;
  source: "live" | "cache" | "demo-fallback";
  rateLimitRemaining?: number;
  rateLimitLimit?: number;
  error?: string;
}

// Global cache instance for Jobvetta responses (15 minutes TTL)
const jobvettaSearchCache = new MemoryCache<JobvettaSearchResult>(15 * 60 * 1000);
const jobvettaDetailCache = new MemoryCache<Job>(30 * 60 * 1000);

export class JobvettaClient {
  private apiKey: string | null;
  private baseUrl: string;

  constructor(apiKey?: string, baseUrl: string = "https://api.jobvetta.com/v1") {
    this.apiKey = apiKey || process.env.JOBVETTA_API_KEY || null;
    this.baseUrl = baseUrl;
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  /**
   * Search jobs from Jobvetta
   */
  async search(params: JobvettaSearchParams = {}): Promise<JobvettaSearchResult> {
    if (!this.isConfigured()) {
      return {
        jobs: [],
        total: 0,
        source: "demo-fallback",
        error: "JOBVETTA_API_KEY is not configured",
      };
    }

    // Build URL query params
    const queryParams = new URLSearchParams();
    if (params.q && params.q.trim()) {
      queryParams.set("q", params.q.trim());
    }
    if (params.location && params.location.trim() && params.location !== "All India") {
      queryParams.set("location", params.location.trim());
    }
    if (params.days && params.days >= 1 && params.days <= 365) {
      queryParams.set("days", params.days.toString());
    }
    const limit = Math.min(Math.max(params.limit || 10, 1), 10);
    queryParams.set("limit", limit.toString());

    const cacheKey = `search:${queryParams.toString()}`;
    const cached = jobvettaSearchCache.get(cacheKey);
    if (cached) {
      return {
        ...cached,
        source: "cache",
      };
    }

    const endpoint = `${this.baseUrl}/jobs?${queryParams.toString()}`;

    try {
      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: "application/json",
          "User-Agent": "OneClickJobs/1.0",
        },
        // Abort after 8 seconds
        signal: AbortSignal.timeout(8000),
      });

      // Rate limit headers
      const rateLimitLimit = response.headers.get("X-RateLimit-Limit")
        ? parseInt(response.headers.get("X-RateLimit-Limit")!, 10)
        : undefined;
      const rateLimitRemaining = response.headers.get("X-RateLimit-Remaining")
        ? parseInt(response.headers.get("X-RateLimit-Remaining")!, 10)
        : undefined;

      if (!response.ok) {
        let errorMsg = `Jobvetta API error (${response.status})`;
        try {
          const errBody = await response.json();
          if (errBody && typeof errBody.error === "string") {
            errorMsg = errBody.error;
          }
        } catch {
          // ignore json parse error on error response
        }

        return {
          jobs: [],
          total: 0,
          source: "demo-fallback",
          rateLimitLimit,
          rateLimitRemaining,
          error: errorMsg,
        };
      }

      const rawJson = await response.json();
      const parsed = JobvettaSearchResponseSchema.safeParse(rawJson);

      if (!parsed.success) {
        return {
          jobs: [],
          total: 0,
          source: "demo-fallback",
          rateLimitLimit,
          rateLimitRemaining,
          error: "Malformed response format from Jobvetta API",
        };
      }

      // Convert summaries into canonical Jobs
      const normalizedJobs: Job[] = [];
      for (const summary of parsed.data.jobs) {
        const normResult = normalizeJob({
          providerId: "jobvetta",
          externalId: summary.job_id,
          title: summary.title,
          company: summary.company,
          originalLocation: summary.location,
          originalUrl: summary.url,
          sourceAttribution: "Jobvetta Live",
          workArrangement: summary.work_model,
          employmentType: summary.employment_type,
          isDemo: false,
        });

        if (normResult.success && normResult.job) {
          normalizedJobs.push(normResult.job);
        }
      }

      const result: JobvettaSearchResult = {
        jobs: normalizedJobs,
        total: parsed.data.total,
        source: "live",
        rateLimitLimit,
        rateLimitRemaining,
      };

      // Cache successful response
      jobvettaSearchCache.set(cacheKey, result);
      return result;
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "Network error contacting Jobvetta API";
      return {
        jobs: [],
        total: 0,
        source: "demo-fallback",
        error: errorMsg,
      };
    }
  }

  /**
   * Fetch single job details from Jobvetta
   */
  async getJobById(jobId: string): Promise<Job | null> {
    if (!this.isConfigured()) return null;

    const cacheKey = `job:${jobId}`;
    const cached = jobvettaDetailCache.get(cacheKey);
    if (cached) return cached;

    const endpoint = `${this.baseUrl}/jobs/${encodeURIComponent(jobId)}`;

    try {
      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: "application/json",
          "User-Agent": "OneClickJobs/1.0",
        },
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) return null;

      const rawJson = await response.json();
      const parsed = JobvettaDetailSchema.safeParse(rawJson);
      if (!parsed.success) return null;

      const d = parsed.data;
      const postedAtIso = d.created_at
        ? new Date(d.created_at * 1000).toISOString()
        : null;

      const normResult = normalizeJob({
        providerId: "jobvetta",
        externalId: d.job_id,
        title: d.title,
        company: d.company,
        originalLocation: d.location,
        description: d.description,
        workArrangement: d.work_model,
        employmentType: d.employment_type,
        experienceLevel: d.experience_level,
        requiredQualifications: d.minimum_qualifications || [],
        requiredSkills: d.skills_required || [],
        responsibilities: d.responsibilities || [],
        salaryMin: d.salary_min,
        salaryMax: d.salary_max,
        salaryCurrency: d.salary_currency,
        originalUrl: d.url,
        postedAt: postedAtIso,
        sourceAttribution: "Jobvetta Live",
        isDemo: false,
      });

      if (normResult.success && normResult.job) {
        jobvettaDetailCache.set(cacheKey, normResult.job);
        return normResult.job;
      }

      return null;
    } catch {
      return null;
    }
  }

  // Exposed helper for testing
  clearCache(): void {
    jobvettaSearchCache.clear();
    jobvettaDetailCache.clear();
  }
}
