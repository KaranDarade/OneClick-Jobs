import { MetadataRoute } from "next";
import { DEMO_JOBS } from "@/features/job-search/fixtures";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://oneclickjobs.in";
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/jobs`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/upload-resume`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  const demoJobPages: MetadataRoute.Sitemap = DEMO_JOBS.slice(0, 20).map((job) => ({
    url: `${baseUrl}/jobs/${encodeURIComponent(job.id)}`,
    lastModified: job.postedAt ? new Date(job.postedAt) : now,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  return [...staticPages, ...demoJobPages];
}
