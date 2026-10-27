import { Job } from "@/types/job";

export interface JobSource {
  id: string;
  name: string;
  type: "ats_greenhouse" | "aggregator_jobvetta" | "demo" | string;
  baseUrl?: string;
  isActive: boolean;
  lastSyncedAt?: string;
}

export interface SourceSyncRun {
  id: string;
  sourceId: string;
  status: "success" | "partial" | "failed";
  jobsFound: number;
  jobsInserted: number;
  jobsUpdated: number;
  errorMessage?: string;
  durationMs: number;
  createdAt: string;
}

export interface SavedJobRecord {
  id: string;
  userId: string;
  jobId: string;
  notes?: string;
  savedAt: string;
}

export interface JobQueryOptions {
  query?: string;
  location?: string;
  workArrangement?: string;
  isRemote?: boolean;
  skills?: string[];
  limit?: number;
  offset?: number;
}
