import { notFound } from "next/navigation";
import { getJobById } from "@/features/job-search/search";
import { DEMO_JOBS } from "@/features/job-search/fixtures";
import { JobDetailClient } from "@/components/jobs/job-detail-client";

import { JobvettaClient } from "@/server/providers/jobvetta/client";

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

  // 2. If not found in demo and begins with jobvetta:, fetch from Jobvetta client
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
