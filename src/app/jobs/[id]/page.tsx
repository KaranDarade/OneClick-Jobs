import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getJobById } from "@/features/job-search/search";
import { JobDetailClient } from "@/components/jobs/job-detail-client";
import { JobvettaClient } from "@/server/providers/jobvetta/client";
import { GreenhouseClient } from "@/server/providers/greenhouse/client";
import { LeverClient } from "@/server/providers/lever/client";
import { AshbyClient } from "@/server/providers/ashby/client";
import { AdzunaClient } from "@/server/providers/adzuna/client";
import { JoobleClient } from "@/server/providers/jooble/client";
import { ApifyClient } from "@/server/providers/apify/client";

export const instant = false;

interface JobDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function JobDetailPage({ params }: JobDetailPageProps) {
  await connection();
  const resolvedParams = await params;
  const decodedId = decodeURIComponent(resolvedParams.id);

  // 1. Check demo jobs first
  let job = getJobById(decodedId);

  // 2. Greenhouse ATS job
  if (!job && decodedId.startsWith("greenhouse:")) {
    const externalId = decodedId.replace("greenhouse:", "");
    const greenhouse = new GreenhouseClient();
    const liveJob = await greenhouse.getJobById(externalId);
    if (liveJob) job = liveJob;
  }

  // 3. Lever ATS job
  if (!job && decodedId.startsWith("lever:")) {
    const externalId = decodedId.replace("lever:", "");
    const lever = new LeverClient();
    const liveJob = await lever.getJobById(externalId);
    if (liveJob) job = liveJob;
  }

  // 4. Ashby ATS job
  if (!job && decodedId.startsWith("ashby:")) {
    const externalId = decodedId.replace("ashby:", "");
    const ashby = new AshbyClient();
    const liveJob = await ashby.getJobById(externalId);
    if (liveJob) job = liveJob;
  }

  // 5. Adzuna job
  if (!job && decodedId.startsWith("adzuna:")) {
    const externalId = decodedId.replace("adzuna:", "");
    const adzuna = new AdzunaClient();
    const liveJob = await adzuna.getJobById(externalId);
    if (liveJob) job = liveJob;
  }

  // 6. Jooble job
  if (!job && decodedId.startsWith("jooble:")) {
    const externalId = decodedId.replace("jooble:", "");
    const jooble = new JoobleClient();
    const liveJob = await jooble.getJobById(externalId);
    if (liveJob) job = liveJob;
  }

  // 7. Apify job
  if (!job && decodedId.startsWith("apify:")) {
    const externalId = decodedId.replace("apify:", "");
    const apify = new ApifyClient();
    const liveJob = await apify.getJobById(externalId);
    if (liveJob) job = liveJob;
  }

  // 8. Jobvetta job
  if (!job && decodedId.startsWith("jobvetta:")) {
    const externalId = decodedId.replace("jobvetta:", "");
    const client = new JobvettaClient();
    const liveJob = await client.getJobById(externalId);
    if (liveJob) job = liveJob;
  }

  if (!job) {
    notFound();
  }

  return <JobDetailClient job={job} />;
}
