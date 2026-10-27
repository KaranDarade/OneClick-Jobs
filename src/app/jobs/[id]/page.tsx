import { notFound } from "next/navigation";
import { getJobById } from "@/features/job-search/search";
import { DEMO_JOBS } from "@/features/job-search/fixtures";
import { JobDetailClient } from "@/components/jobs/job-detail-client";
import { JobvettaClient } from "@/server/providers/jobvetta/client";
import { GreenhouseClient } from "@/server/providers/greenhouse/client";

export function generateStaticParams() {
  return DEMO_JOBS.map((job) => ({
    id: encodeURIComponent(job.id),
  }));
}

interface JobDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function JobDetailPage({ params }: JobDetailPageProps) {
  const resolvedParams = await params;
  const decodedId = decodeURIComponent(resolvedParams.id);

  // 1. Check demo jobs first
  let job = getJobById(decodedId);

  // 2. If Greenhouse ATS job, fetch from GreenhouseClient
  if (!job && decodedId.startsWith("greenhouse:")) {
    const externalId = decodedId.replace("greenhouse:", "");
    const greenhouse = new GreenhouseClient();
    const liveJob = await greenhouse.getJobById(externalId);
    if (liveJob) {
      job = liveJob;
    }
  }

  // 3. If Jobvetta job, fetch from JobvettaClient
  if (!job && decodedId.startsWith("jobvetta:")) {
    const externalId = decodedId.replace("jobvetta:", "");
    const client = new JobvettaClient();
    const liveJob = await client.getJobById(externalId);
    if (liveJob) {
      job = liveJob;
    }
  }

  if (!job) {
    notFound();
  }

  return <JobDetailClient job={job} />;
}
