import { NextRequest, NextResponse } from "next/server";
import { JobvettaClient } from "@/server/providers/jobvetta/client";
import { GreenhouseClient } from "@/server/providers/greenhouse/client";
import { LeverClient } from "@/server/providers/lever/client";
import { AshbyClient } from "@/server/providers/ashby/client";
import { AdzunaClient } from "@/server/providers/adzuna/client";
import { JoobleClient } from "@/server/providers/jooble/client";
import { ApifyClient } from "@/server/providers/apify/client";
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

  // 3. Handle Lever ATS job lookup
  if (decodedId.startsWith("lever:")) {
    const externalId = decodedId.replace("lever:", "");
    const lever = new LeverClient();
    const job = await lever.getJobById(externalId);
    if (!job) {
      return NextResponse.json({ error: "Job not found or no longer active on Lever" }, { status: 404 });
    }
    return NextResponse.json({ job, source: "live" });
  }

  // 4. Handle Ashby ATS job lookup
  if (decodedId.startsWith("ashby:")) {
    const externalId = decodedId.replace("ashby:", "");
    const ashby = new AshbyClient();
    const job = await ashby.getJobById(externalId);
    if (!job) {
      return NextResponse.json({ error: "Job not found or no longer active on Ashby" }, { status: 404 });
    }
    return NextResponse.json({ job, source: "live" });
  }

  // 5. Handle Adzuna job lookup
  if (decodedId.startsWith("adzuna:")) {
    const externalId = decodedId.replace("adzuna:", "");
    const adzuna = new AdzunaClient();
    const job = await adzuna.getJobById(externalId);
    if (!job) {
      return NextResponse.json({ error: "Job not found in Adzuna cache" }, { status: 404 });
    }
    return NextResponse.json({ job, source: "live" });
  }

  // 6. Handle Jooble job lookup
  if (decodedId.startsWith("jooble:")) {
    const externalId = decodedId.replace("jooble:", "");
    const jooble = new JoobleClient();
    const job = await jooble.getJobById(externalId);
    if (!job) {
      return NextResponse.json({ error: "Job not found in Jooble cache" }, { status: 404 });
    }
    return NextResponse.json({ job, source: "live" });
  }

  // 7. Handle Apify job lookup
  if (decodedId.startsWith("apify:")) {
    const externalId = decodedId.replace("apify:", "");
    const apify = new ApifyClient();
    const job = await apify.getJobById(externalId);
    if (!job) {
      return NextResponse.json({ error: "Job not found in Apify cache" }, { status: 404 });
    }
    return NextResponse.json({ job, source: "live" });
  }

  // 8. Handle Jobvetta job lookup
  if (decodedId.startsWith("jobvetta:")) {
    const externalId = decodedId.replace("jobvetta:", "");
    const client = new JobvettaClient();
    const job = await client.getJobById(externalId);
    if (!job) {
      return NextResponse.json({ error: "Job not found or no longer active" }, { status: 404 });
    }
    return NextResponse.json({ job, source: "live" });
  }

  // 9. Direct ID fallback lookup
  const demoFallback = getDemoJobById(decodedId);
  if (demoFallback) {
    return NextResponse.json({ job: demoFallback, source: "demo" });
  }

  return NextResponse.json({ error: "Job not found" }, { status: 404 });
}
