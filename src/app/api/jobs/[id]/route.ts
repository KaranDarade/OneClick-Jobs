import { NextRequest, NextResponse } from "next/server";
import { JobvettaClient } from "@/server/providers/jobvetta/client";
import { getJobById as getDemoJobById } from "@/features/job-search/search";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const decodedId = decodeURIComponent(id);

  // Check demo jobs first if ID starts with demo:
  if (decodedId.startsWith("demo:")) {
    const demoJob = getDemoJobById(decodedId);
    if (!demoJob) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    return NextResponse.json({ job: demoJob, source: "demo" });
  }

  // Handle Jobvetta job lookup
  const client = new JobvettaClient();
  if (decodedId.startsWith("jobvetta:")) {
    const externalId = decodedId.replace("jobvetta:", "");
    const job = await client.getJobById(externalId);
    if (!job) {
      return NextResponse.json({ error: "Job not found or no longer active" }, { status: 404 });
    }
    return NextResponse.json({ job, source: "live" });
  }

  // Direct ID fallback lookup
  const demoFallback = getDemoJobById(decodedId);
  if (demoFallback) {
    return NextResponse.json({ job: demoFallback, source: "demo" });
  }

  return NextResponse.json({ error: "Job not found" }, { status: 404 });
}
