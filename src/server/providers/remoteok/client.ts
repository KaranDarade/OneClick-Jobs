import { Job } from "@/types/job";
import { normalizeJob } from "@/server/jobs/normalize";
import { MemoryCache } from "@/server/cache";

interface RemoteOkRawJob {
  id?: string | number;
  slug?: string;
  epoch?: number;
  date?: string;
  company?: string;
  company_logo?: string;
  position?: string;
  tags?: string[];
  description?: string;
  location?: string;
  original?: boolean;
  url?: string;
  apply_url?: string;
}

const remoteOkCache = new MemoryCache<Job[]>(15 * 60 * 1000);

/**
 * 100% Free Public API client for RemoteOK (Zero API keys, zero authentication required)
 * https://remoteok.com/api
 */
export class RemoteOkClient {
  private readonly baseUrl = "https://remoteok.com/api";

  async getJobs(limit = 30): Promise<Job[]> {
    const cacheKey = `remoteok_jobs_${limit}`;
    const cached = remoteOkCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(this.baseUrl, {
        headers: {
          "User-Agent": "OneClick-Jobs/1.0 (Job Aggregator; Open Tech Discovery)",
          Accept: "application/json",
        },
        signal: controller.signal,
        next: { revalidate: 3600 }, // Cache on edge for 1 hour
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        return [];
      }

      const rawItems: unknown = await res.json();
      if (!Array.isArray(rawItems)) {
        return [];
      }

      // First item in RemoteOK JSON is often a legal notice object, not a job
      const validItems = rawItems.filter(
        (item): item is RemoteOkRawJob =>
          typeof item === "object" && item !== null && Boolean(item.position && item.company)
      );

      const normalizedJobs: Job[] = [];

      for (const item of validItems.slice(0, limit)) {
        const externalId = String(item.id || item.slug || Math.random().toString(36).substring(7));
        const tags = Array.isArray(item.tags) ? item.tags : [];
        const applyUrl = item.apply_url || item.url || `https://remoteok.com/remote-jobs/${item.slug || externalId}`;

        const norm = normalizeJob({
          providerId: "remoteok",
          externalId,
          title: item.position || "Software Engineer",
          company: item.company || "Technology Company",
          companyLogoUrl: item.company_logo || null,
          originalUrl: applyUrl,
          sourceAttribution: `${item.company || "RemoteOK"} (RemoteOK Official)`,
          originalLocation: item.location || "Remote, Worldwide",
          workArrangement: "remote",
          remoteEligibility: "Worldwide Remote",
          employmentType: "full-time",
          requiredSkills: tags,
          description: item.description || `Verified remote opportunity at ${item.company}.`,
          postedAt: item.date || (item.epoch ? new Date(item.epoch * 1000).toISOString() : new Date().toISOString()),
          providerMeta: {
            source: "remoteok",
            tags,
            applyUrl,
          },
        });

        if (norm.success && norm.job) {
          normalizedJobs.push(norm.job);
        }
      }

      remoteOkCache.set(cacheKey, normalizedJobs);
      return normalizedJobs;
    } catch {
      // Graceful error isolation: if remoteok times out or fails, fail silently
      return [];
    }
  }

  async getJobById(externalId: string): Promise<Job | null> {
    const all = await this.getJobs(50);
    return all.find((j) => j.externalId === externalId || j.id === `remoteok:${externalId}`) || null;
  }
}
