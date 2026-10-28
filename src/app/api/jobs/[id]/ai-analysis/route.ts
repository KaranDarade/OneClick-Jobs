import { NextRequest, NextResponse } from "next/server";
import { getJobById } from "@/features/job-search/search";
import { GreenhouseClient } from "@/server/providers/greenhouse/client";
import { LeverClient } from "@/server/providers/lever/client";
import { AshbyClient } from "@/server/providers/ashby/client";
import { AdzunaClient } from "@/server/providers/adzuna/client";
import { JoobleClient } from "@/server/providers/jooble/client";
import { ApifyClient } from "@/server/providers/apify/client";
import { JobvettaClient } from "@/server/providers/jobvetta/client";
import { getAIProvider } from "@/server/ai/provider";
import { Job } from "@/types/job";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const decodedId = decodeURIComponent(id);

    // 1. Resolve job
    let job: Job | null = getJobById(decodedId) ?? null;

    if (!job && decodedId.startsWith("greenhouse:")) {
      const externalId = decodedId.replace("greenhouse:", "");
      const greenhouse = new GreenhouseClient();
      job = await greenhouse.getJobById(externalId);
    }

    if (!job && decodedId.startsWith("lever:")) {
      const externalId = decodedId.replace("lever:", "");
      const lever = new LeverClient();
      job = await lever.getJobById(externalId);
    }

    if (!job && decodedId.startsWith("ashby:")) {
      const externalId = decodedId.replace("ashby:", "");
      const ashby = new AshbyClient();
      job = await ashby.getJobById(externalId);
    }

    if (!job && decodedId.startsWith("adzuna:")) {
      const externalId = decodedId.replace("adzuna:", "");
      const adzuna = new AdzunaClient();
      job = await adzuna.getJobById(externalId);
    }

    if (!job && decodedId.startsWith("jooble:")) {
      const externalId = decodedId.replace("jooble:", "");
      const jooble = new JoobleClient();
      job = await jooble.getJobById(externalId);
    }

    if (!job && decodedId.startsWith("apify:")) {
      const externalId = decodedId.replace("apify:", "");
      const apify = new ApifyClient();
      job = await apify.getJobById(externalId);
    }

    if (!job && decodedId.startsWith("jobvetta:")) {
      const externalId = decodedId.replace("jobvetta:", "");
      const client = new JobvettaClient();
      job = await client.getJobById(externalId);
    }

    if (!job) {
      return NextResponse.json({ success: false, error: "Job not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const candidate = body.candidate || { skills: [] };
    const breakdown = body.breakdown;

    const aiProvider = getAIProvider();
    const analysis = await aiProvider.generateMatchExplanation(job, candidate, breakdown);

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "AI Analysis failed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
