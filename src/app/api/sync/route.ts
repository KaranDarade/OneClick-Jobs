import { NextResponse } from "next/server";
import { JobSyncService } from "@/server/db/sync";
import { getJobRepository } from "@/server/db/repository";

export async function GET() {
  try {
    const repo = getJobRepository();
    const [sources, history, stats] = await Promise.all([
      repo.getSources(),
      repo.getLatestSyncRuns(10),
      repo.queryJobs({ limit: 1 }),
    ]);

    return NextResponse.json({
      success: true,
      repositoryType: repo.constructor.name,
      totalStoredJobs: stats.total,
      sources,
      latestSyncRuns: history,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to retrieve sync status";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST() {
  try {
    const syncService = new JobSyncService();
    const result = await syncService.syncAll();

    return NextResponse.json({
      success: true,
      message: "Sync completed successfully",
      ...result,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
