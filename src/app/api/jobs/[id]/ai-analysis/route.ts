import { NextRequest, NextResponse } from "next/server";
import { getJobById } from "@/features/job-search/search";
import { GreenhouseClient } from "@/server/providers/greenhouse/client";
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
