import { getJobRepository, IJobRepository } from "./repository";
import { GreenhouseClient } from "@/server/providers/greenhouse/client";
import { LeverClient } from "@/server/providers/lever/client";
import { AshbyClient } from "@/server/providers/ashby/client";
import { JobvettaClient } from "@/server/providers/jobvetta/client";
import { AdzunaClient } from "@/server/providers/adzuna/client";
import { JoobleClient } from "@/server/providers/jooble/client";
import { ApifyClient } from "@/server/providers/apify/client";
import { deduplicateJobs } from "@/server/jobs/deduplicate";
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
  private lever: LeverClient;
  private ashby: AshbyClient;
  private jobvetta: JobvettaClient;
  private adzuna: AdzunaClient;
  private jooble: JoobleClient;
  private apify: ApifyClient;

  constructor(repo?: IJobRepository) {
    this.repo = repo ?? getJobRepository();
    this.greenhouse = new GreenhouseClient();
    this.lever = new LeverClient();
    this.ashby = new AshbyClient();
    this.jobvetta = new JobvettaClient();
    this.adzuna = new AdzunaClient();
    this.jooble = new JoobleClient();
    this.apify = new ApifyClient();
  }

  async syncGreenhouse(): Promise<SyncResult> {
    const start = Date.now();
    try {
      const jobs = await this.greenhouse.search();
      const report = deduplicateJobs(jobs);
      const { inserted, updated } = await this.repo.upsertJobs(report.uniqueJobs);
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

  async syncLever(): Promise<SyncResult> {
    const start = Date.now();
    try {
      const jobs = await this.lever.search();
      const report = deduplicateJobs(jobs);
      const { inserted, updated } = await this.repo.upsertJobs(report.uniqueJobs);
      const durationMs = Date.now() - start;

      await this.repo.recordSyncRun({
        sourceId: "lever",
        status: "success",
        jobsFound: jobs.length,
        jobsInserted: inserted,
        jobsUpdated: updated,
        durationMs,
      });

      return {
        sourceId: "lever",
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
        sourceId: "lever",
        status: "failed",
        jobsFound: 0,
        jobsInserted: 0,
        jobsUpdated: 0,
        errorMessage: error,
        durationMs,
      });

      return {
        sourceId: "lever",
        success: false,
        jobsFound: 0,
        jobsInserted: 0,
        jobsUpdated: 0,
        durationMs,
        error,
      };
    }
  }

  async syncAshby(): Promise<SyncResult> {
    const start = Date.now();
    try {
      const jobs = await this.ashby.search();
      const report = deduplicateJobs(jobs);
      const { inserted, updated } = await this.repo.upsertJobs(report.uniqueJobs);
      const durationMs = Date.now() - start;

      await this.repo.recordSyncRun({
        sourceId: "ashby",
        status: "success",
        jobsFound: jobs.length,
        jobsInserted: inserted,
        jobsUpdated: updated,
        durationMs,
      });

      return {
        sourceId: "ashby",
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
        sourceId: "ashby",
        status: "failed",
        jobsFound: 0,
        jobsInserted: 0,
        jobsUpdated: 0,
        errorMessage: error,
        durationMs,
      });

      return {
        sourceId: "ashby",
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
      const searchResult = await this.jobvetta.search();
      const report = deduplicateJobs(searchResult.jobs);
      const { inserted, updated } = await this.repo.upsertJobs(report.uniqueJobs);
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
    const [ghResult, leverResult, ashbyResult, jvResult] = await Promise.all([
      this.syncGreenhouse(),
      this.syncLever(),
      this.syncAshby(),
      this.syncJobvetta(),
    ]);

    return {
      results: [ghResult, leverResult, ashbyResult, jvResult],
      totalDurationMs: Date.now() - start,
    };
  }

  async getSyncHistory(limit: number = 10): Promise<SourceSyncRun[]> {
    return this.repo.getLatestSyncRuns(limit);
  }
}
