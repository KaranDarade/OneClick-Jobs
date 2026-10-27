import { Job } from "@/types/job";
import { JobSource, SourceSyncRun, JobQueryOptions } from "./schema";
import { DEMO_JOBS } from "@/features/job-search/fixtures";

export interface IJobRepository {
  upsertJobs(jobs: Job[]): Promise<{ inserted: number; updated: number }>;
  getJobById(id: string): Promise<Job | null>;
  queryJobs(options?: JobQueryOptions): Promise<{ jobs: Job[]; total: number }>;
  recordSyncRun(run: Omit<SourceSyncRun, "id" | "createdAt">): Promise<SourceSyncRun>;
  getLatestSyncRuns(limit?: number): Promise<SourceSyncRun[]>;
  getSources(): Promise<JobSource[]>;
  clear?(): Promise<void>;
}

export class InMemoryJobRepository implements IJobRepository {
  private jobs = new Map<string, Job>();
  private syncRuns: SourceSyncRun[] = [];
  private sources: JobSource[] = [
    {
      id: "greenhouse",
      name: "Greenhouse ATS",
      type: "ats_greenhouse",
      baseUrl: "https://boards-api.greenhouse.io/v1/boards",
      isActive: true,
    },
    {
      id: "jobvetta",
      name: "Jobvetta API",
      type: "aggregator_jobvetta",
      baseUrl: "https://api.jobvetta.com/v1",
      isActive: true,
    },
    {
      id: "demo",
      name: "Demo Fixtures",
      type: "demo",
      isActive: true,
    },
  ];

  constructor(seedWithDemo: boolean = true) {
    if (seedWithDemo) {
      for (const job of DEMO_JOBS) {
        this.jobs.set(job.id, job);
      }
    }
  }

  async upsertJobs(jobs: Job[]): Promise<{ inserted: number; updated: number }> {
    let inserted = 0;
    let updated = 0;

    for (const job of jobs) {
      if (this.jobs.has(job.id)) {
        updated++;
      } else {
        inserted++;
      }
      this.jobs.set(job.id, job);
    }

    return { inserted, updated };
  }

  async getJobById(id: string): Promise<Job | null> {
    return this.jobs.get(id) ?? null;
  }

  async queryJobs(options: JobQueryOptions = {}): Promise<{ jobs: Job[]; total: number }> {
    let results = Array.from(this.jobs.values());

    if (options.query) {
      const q = options.query.toLowerCase();
      results = results.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.company.toLowerCase().includes(q) ||
          j.descriptionText.toLowerCase().includes(q)
      );
    }

    if (options.location) {
      const loc = options.location.toLowerCase();
      results = results.filter(
        (j) =>
          j.city.toLowerCase().includes(loc) ||
          j.locationRaw.toLowerCase().includes(loc)
      );
    }

    if (options.workArrangement) {
      results = results.filter((j) => j.workArrangement === options.workArrangement);
    }

    if (options.isRemote !== undefined) {
      results = results.filter((j) => j.isRemote === options.isRemote);
    }

    if (options.skills && options.skills.length > 0) {
      const targetSkills = options.skills.map((s) => s.toLowerCase());
      results = results.filter((j) =>
        j.extractedSkills.some((sk) => targetSkills.includes(sk.toLowerCase()))
      );
    }

    const total = results.length;
    const offset = options.offset ?? 0;
    const limit = options.limit ?? 50;
    const paginated = results.slice(offset, offset + limit);

    return { jobs: paginated, total };
  }

  async recordSyncRun(run: Omit<SourceSyncRun, "id" | "createdAt">): Promise<SourceSyncRun> {
    const record: SourceSyncRun = {
      ...run,
      id: `sync-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    this.syncRuns.unshift(record);

    // update source lastSyncedAt
    const src = this.sources.find((s) => s.id === run.sourceId);
    if (src) {
      src.lastSyncedAt = record.createdAt;
    }

    return record;
  }

  async getLatestSyncRuns(limit: number = 10): Promise<SourceSyncRun[]> {
    return this.syncRuns.slice(0, limit);
  }

  async getSources(): Promise<JobSource[]> {
    return [...this.sources];
  }

  async clear(): Promise<void> {
    this.jobs.clear();
    this.syncRuns = [];
  }
}

export class SupabaseJobRepository implements IJobRepository {
  private url: string;
  private key: string;
  private fallback: InMemoryJobRepository;

  constructor(url: string, key: string) {
    this.url = url.replace(/\/$/, "");
    this.key = key;
    this.fallback = new InMemoryJobRepository();
  }

  private async fetchSupabase(path: string, options: RequestInit = {}) {
    const headers = {
      apikey: this.key,
      Authorization: `Bearer ${this.key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...options.headers,
    };

    const res = await fetch(`${this.url}/rest/v1/${path}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      throw new Error(`Supabase error [${res.status}]: ${await res.text()}`);
    }

    return res.json();
  }

  async upsertJobs(jobs: Job[]): Promise<{ inserted: number; updated: number }> {
    try {
      const records = jobs.map((j) => ({
        id: j.id,
        title: j.title,
        company: j.company,
        company_slug: j.companySlug ?? null,
        location_raw: j.locationRaw,
        city: j.city,
        state: j.state ?? null,
        country: j.country,
        is_remote: j.isRemote,
        work_arrangement: j.workArrangement,
        experience_min: j.experienceMin ?? null,
        experience_max: j.experienceMax ?? null,
        salary_min: j.salaryMin ?? null,
        salary_max: j.salaryMax ?? null,
        salary_currency: j.salaryCurrency ?? "INR",
        description_html: j.descriptionHtml,
        description_text: j.descriptionText,
        url: j.url,
        source: j.source,
        provider: j.provider,
        posted_at: j.postedAt,
        extracted_skills: j.extractedSkills,
        is_active: true,
      }));

      await this.fetchSupabase("jobs?on_conflict=id", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify(records),
      });

      return { inserted: records.length, updated: 0 };
    } catch {
      // Fallback cleanly to in-memory store if network/credentials fail
      return this.fallback.upsertJobs(jobs);
    }
  }

  async getJobById(id: string): Promise<Job | null> {
    try {
      const rows = await this.fetchSupabase(`jobs?id=eq.${encodeURIComponent(id)}&limit=1`);
      if (!rows || rows.length === 0) return null;
      const row = rows[0];
      return {
        id: row.id,
        title: row.title,
        company: row.company,
        companySlug: row.company_slug,
        locationRaw: row.location_raw,
        city: row.city,
        state: row.state,
        country: row.country,
        isRemote: row.is_remote,
        workArrangement: row.work_arrangement,
        experienceMin: row.experience_min,
        experienceMax: row.experience_max,
        salaryMin: row.salary_min,
        salaryMax: row.salary_max,
        salaryCurrency: row.salary_currency,
        descriptionHtml: row.description_html,
        descriptionText: row.description_text,
        url: row.url,
        source: row.source,
        provider: row.provider,
        postedAt: row.posted_at,
        extractedSkills: row.extracted_skills || [],
      };
    } catch {
      return this.fallback.getJobById(id);
    }
  }

  async queryJobs(options: JobQueryOptions = {}): Promise<{ jobs: Job[]; total: number }> {
    try {
      let query = "jobs?select=*&is_active=eq.true&order=posted_at.desc";
      if (options.limit) query += `&limit=${options.limit}`;
      if (options.offset) query += `&offset=${options.offset}`;
      if (options.workArrangement) query += `&work_arrangement=eq.${encodeURIComponent(options.workArrangement)}`;
      if (options.isRemote !== undefined) query += `&is_remote=eq.${options.isRemote}`;

      const rows = await this.fetchSupabase(query);
      const jobs: Job[] = rows.map((row: Record<string, unknown>) => ({
        id: String(row.id),
        title: String(row.title),
        company: String(row.company),
        companySlug: row.company_slug ? String(row.company_slug) : undefined,
        locationRaw: String(row.location_raw),
        city: String(row.city),
        state: row.state ? String(row.state) : undefined,
        country: String(row.country || "India"),
        isRemote: Boolean(row.is_remote),
        workArrangement: (row.work_arrangement as Job["workArrangement"]) || "On-site",
        experienceMin: typeof row.experience_min === "number" ? row.experience_min : undefined,
        experienceMax: typeof row.experience_max === "number" ? row.experience_max : undefined,
        salaryMin: typeof row.salary_min === "number" ? row.salary_min : undefined,
        salaryMax: typeof row.salary_max === "number" ? row.salary_max : undefined,
        salaryCurrency: typeof row.salary_currency === "string" ? row.salary_currency : "INR",
        descriptionHtml: String(row.description_html || ""),
        descriptionText: String(row.description_text || ""),
        url: String(row.url),
        source: String(row.source),
        provider: (row.provider as Job["provider"]) || "greenhouse",
        postedAt: String(row.posted_at || new Date().toISOString()),
        extractedSkills: Array.isArray(row.extracted_skills) ? (row.extracted_skills as string[]) : [],
      }));

      return { jobs, total: jobs.length };
    } catch {
      return this.fallback.queryJobs(options);
    }
  }

  async recordSyncRun(run: Omit<SourceSyncRun, "id" | "createdAt">): Promise<SourceSyncRun> {
    try {
      const record = {
        source_id: run.sourceId,
        status: run.status,
        jobs_found: run.jobsFound,
        jobs_inserted: run.jobsInserted,
        jobs_updated: run.jobsUpdated,
        error_message: run.errorMessage || null,
        duration_ms: run.durationMs,
      };

      const result = await this.fetchSupabase("source_sync_runs", {
        method: "POST",
        body: JSON.stringify(record),
      });

      return {
        id: result[0]?.id || `sync-${Date.now()}`,
        sourceId: run.sourceId,
        status: run.status,
        jobsFound: run.jobsFound,
        jobsInserted: run.jobsInserted,
        jobsUpdated: run.jobsUpdated,
        errorMessage: run.errorMessage,
        durationMs: run.durationMs,
        createdAt: result[0]?.created_at || new Date().toISOString(),
      };
    } catch {
      return this.fallback.recordSyncRun(run);
    }
  }

  async getLatestSyncRuns(limit: number = 10): Promise<SourceSyncRun[]> {
    try {
      const rows = await this.fetchSupabase(`source_sync_runs?select=*&order=created_at.desc&limit=${limit}`);
      return rows.map((r: Record<string, unknown>) => ({
        id: String(r.id),
        sourceId: String(r.source_id),
        status: (r.status as SourceSyncRun["status"]) || "success",
        jobsFound: Number(r.jobs_found || 0),
        jobsInserted: Number(r.jobs_inserted || 0),
        jobsUpdated: Number(r.jobs_updated || 0),
        errorMessage: r.error_message ? String(r.error_message) : undefined,
        durationMs: Number(r.duration_ms || 0),
        createdAt: String(r.created_at),
      }));
    } catch {
      return this.fallback.getLatestSyncRuns(limit);
    }
  }

  async getSources(): Promise<JobSource[]> {
    try {
      const rows = await this.fetchSupabase("job_sources?select=*");
      return rows.map((r: Record<string, unknown>) => ({
        id: String(r.id),
        name: String(r.name),
        type: String(r.type),
        baseUrl: r.base_url ? String(r.base_url) : undefined,
        isActive: Boolean(r.is_active),
        lastSyncedAt: r.last_synced_at ? String(r.last_synced_at) : undefined,
      }));
    } catch {
      return this.fallback.getSources();
    }
  }
}

// Global Singleton Repository Instance
let repositoryInstance: IJobRepository | null = null;

export function getJobRepository(): IJobRepository {
  if (repositoryInstance) return repositoryInstance;

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    repositoryInstance = new SupabaseJobRepository(supabaseUrl, supabaseKey);
  } else {
    repositoryInstance = new InMemoryJobRepository();
  }

  return repositoryInstance;
}
