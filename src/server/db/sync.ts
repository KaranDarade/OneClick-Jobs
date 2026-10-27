import { getJobRepository, IJobRepository } from "./repository";
import { GreenhouseClient } from "@/server/providers/greenhouse/client";
import { JobvettaClient } from "@/server/providers/jobvetta/client";
import { deduplicateJobs } from "@/server/jobs/deduplicate";
import { Job } from "@/types/job";
import { SourceSyncRun } from "./schema";

export interface SyncResult {
  sourceId: string;
  success: boolean;
  jobsFound: number;
  jobsInserted: number;
  jobsUpdated: number;
  durationMs: number;
  error?: string;
}

export class JobSyncService {
  private repo: IJobRepository;
  private greenhouse: GreenhouseClient;
  private jobvetta: JobvettaClient;

  constructor(repo?: IJobRepository) {
    this.repo = repo ?? getJobRepository();
    this.greenhouse = new GreenhouseClient();
    this.jobvetta = new JobvettaClient();
  }

  async syncGreenhouse(): Promise<SyncResult> {
    const start = Date.now();
    try {
      const jobs = await this.greenhouse.getAllJobs();
      const deduplicated = deduplicateJobs(jobs);
      const { inserted, updated } = await this.repo.upsertJobs(deduplicated);
      const durationMs = Date.now() - start;

      await this.repo.recordSyncRun({
        sourceId: "greenhouse",
        status: "success",
        jobsFound: jobs.length,
        jobsInserted: inserted,
        jobsUpdated: updated,
        durationMs,
      });

      return {
        sourceId: "greenhouse",
        success: true,
        jobsFound: jobs.length,
        jobsInserted: inserted,
        jobsUpdated: updated,
        durationMs,
      };
    } catch (err: unknown) {
      const durationMs = Date.now() - start;
      const error = err instanceof Error ? err.message : String(err);

      await this.repo.recordSyncRun({
        sourceId: "greenhouse",
        status: "failed",
        jobsFound: 0,
        jobsInserted: 0,
        jobsUpdated: 0,
        errorMessage: error,
        durationMs,
      });

      return {
        sourceId: "greenhouse",
        success: false,
        jobsFound: 0,
        jobsInserted: 0,
        jobsUpdated: 0,
        durationMs,
        error,
      };
    }
  }

  async syncJobvetta(): Promise<SyncResult> {
    const start = Date.now();
    try {
      const searchResult = await this.jobvetta.searchJobs();
      const deduplicated = deduplicateJobs(searchResult.jobs);
      const { inserted, updated } = await this.repo.upsertJobs(deduplicated);
      const durationMs = Date.now() - start;

      await this.repo.recordSyncRun({
        sourceId: "jobvetta",
        status: "success",
        jobsFound: searchResult.jobs.length,
        jobsInserted: inserted,
        jobsUpdated: updated,
        durationMs,
      });

      return {
        sourceId: "jobvetta",
        success: true,
        jobsFound: searchResult.jobs.length,
        jobsInserted: inserted,
        jobsUpdated: updated,
        durationMs,
      };
    } catch (err: unknown) {
      const durationMs = Date.now() - start;
      const error = err instanceof Error ? err.message : String(err);

      await this.repo.recordSyncRun({
        sourceId: "jobvetta",
        status: "failed",
        jobsFound: 0,
        jobsInserted: 0,
        jobsUpdated: 0,
        errorMessage: error,
        durationMs,
      });

      return {
        sourceId: "jobvetta",
        success: false,
        jobsFound: 0,
        jobsInserted: 0,
        jobsUpdated: 0,
        durationMs,
        error,
      };
    }
  }

  async syncAll(): Promise<{ results: SyncResult[]; totalDurationMs: number }> {
    const start = Date.now();
    const [ghResult, jvResult] = await Promise.all([
      this.syncGreenhouse(),
      this.syncJobvetta(),
    ]);

    return {
      results: [ghResult, jvResult],
      totalDurationMs: Date.now() - start,
    };
  }

  async getSyncHistory(limit: number = 10): Promise<SourceSyncRun[]> {
    return this.repo.getLatestSyncRuns(limit);
  }
}
