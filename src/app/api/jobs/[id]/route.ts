import { NextRequest, NextResponse } from "next/server";
import { JobvettaClient } from "@/server/providers/jobvetta/client";
import { GreenhouseClient } from "@/server/providers/greenhouse/client";
import { getJobById as getDemoJobById } from "@/features/job-search/search";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const decodedId = decodeURIComponent(id);

  // 1. Check demo jobs if ID starts with demo:
  if (decodedId.startsWith("demo:")) {
    const demoJob = getDemoJobById(decodedId);
    if (!demoJob) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    return NextResponse.json({ job: demoJob, source: "demo" });
  }

  // 2. Handle Greenhouse ATS job lookup
  if (decodedId.startsWith("greenhouse:")) {
    const externalId = decodedId.replace("greenhouse:", "");
    const greenhouse = new GreenhouseClient();
    const job = await greenhouse.getJobById(externalId);
    if (!job) {
      return NextResponse.json({ error: "Job not found or no longer active on employer board" }, { status: 404 });
    }
    return NextResponse.json({ job, source: "live" });
  }

  // 3. Handle Jobvetta job lookup
  if (decodedId.startsWith("jobvetta:")) {
    const externalId = decodedId.replace("jobvetta:", "");
    const client = new JobvettaClient();
    const job = await client.getJobById(externalId);
    if (!job) {
      return NextResponse.json({ error: "Job not found or no longer active" }, { status: 404 });
    }
    return NextResponse.json({ job, source: "live" });
  }

  // 4. Direct ID fallback lookup
  const demoFallback = getDemoJobById(decodedId);
  if (demoFallback) {
    return NextResponse.json({ job: demoFallback, source: "demo" });
  }

  return NextResponse.json({ error: "Job not found" }, { status: 404 });
}
