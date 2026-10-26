import { describe, it, expect } from "vitest";
import { deduplicateJobs, canonicalizeUrl } from "@/server/jobs/deduplicate";
import { Job } from "@/types/job";

const sampleJob1: Job = {
  id: "prov1:job-101",
  providerId: "prov1",
  externalId: "job-101",
  title: "React Developer",
  company: "InnovateTech",
  companyLogoUrl: null,
  originalUrl: "https://innovatetech.com/careers/101?utm_source=linkedin&utm_medium=job_post",
  sourceAttribution: "InnovateTech",
  originalLocation: "Bengaluru, Karnataka",
  normalizedCity: "Bengaluru",
  normalizedState: "Karnataka",
  country: "India",
  workArrangement: "hybrid",
  remoteEligibility: null,
  employmentType: "full-time",
  experienceRange: { minYears: 2, maxYears: 5 },
  experienceLevel: "mid",
  requiredSkills: ["React", "TypeScript"],
  preferredSkills: [],
  requiredQualifications: [],
  preferredQualifications: [],
  description: "Building React UI.",
  responsibilities: [],
  salaryMin: 1200000,
  salaryMax: 1800000,
  salaryCurrency: "INR",
  salaryPeriod: "yearly",
  postedAt: "2026-10-10T10:00:00Z",
  firstSeenAt: "2026-10-10T10:00:00Z",
  lastSeenAt: "2026-10-10T10:00:00Z",
  lastRefreshedAt: "2026-10-10T10:00:00Z",
  status: "active",
  providerMeta: {},
};

describe("Deduplication Engine", () => {
  it("strips UTM parameters in canonicalizeUrl", () => {
    const url1 = "https://example.com/jobs/42?utm_source=twitter&utm_campaign=hiring";
    const url2 = "https://example.com/jobs/42/";
    expect(canonicalizeUrl(url1)).toBe("https://example.com/jobs/42");
    expect(canonicalizeUrl(url2)).toBe("https://example.com/jobs/42");
  });

  it("deduplicates exact provider ID + external ID", () => {
    const duplicate = { ...sampleJob1, id: "prov1:job-101_copy" };
    const report = deduplicateJobs([sampleJob1, duplicate]);

    expect(report.uniqueJobs).toHaveLength(1);
    expect(report.duplicateCount).toBe(1);
    expect(report.mergedDetails[0].reason).toContain("Duplicate provider ID and external ID");
  });

  it("deduplicates by canonical URL even with different UTM parameters or IDs", () => {
    const jobWithDifferentIdAndUtm: Job = {
      ...sampleJob1,
      id: "prov2:ext-999",
      providerId: "prov2",
      externalId: "ext-999",
      originalUrl: "https://innovatetech.com/careers/101?ref=some_board&utm_medium=email",
    };

    const report = deduplicateJobs([sampleJob1, jobWithDifferentIdAndUtm]);
    expect(report.uniqueJobs).toHaveLength(1);
    expect(report.duplicateCount).toBe(1);
    expect(report.mergedDetails[0].reason).toContain("Duplicate canonical job URL");
  });

  it("deduplicates identical company, title, and location from different sources", () => {
    const duplicateFromAggregator: Job = {
      ...sampleJob1,
      id: "aggregator:agg-777",
      providerId: "aggregator",
      externalId: "agg-777",
      originalUrl: "https://aggregator.in/view/777", // Different URL
      company: "InnovateTech",
      title: "React Developer",
      normalizedCity: "Bengaluru",
    };

    const report = deduplicateJobs([sampleJob1, duplicateFromAggregator]);
    expect(report.uniqueJobs).toHaveLength(1);
    expect(report.duplicateCount).toBe(1);
    expect(report.mergedDetails[0].reason).toContain("Duplicate company, title, and location");
  });

  it("does NOT merge different roles at the same company", () => {
    const differentRole: Job = {
      ...sampleJob1,
      id: "prov1:job-102",
      externalId: "job-102",
      title: "Backend Engineer (Node.js)",
      originalUrl: "https://innovatetech.com/careers/102",
    };

    const report = deduplicateJobs([sampleJob1, differentRole]);
    expect(report.uniqueJobs).toHaveLength(2);
    expect(report.duplicateCount).toBe(0);
  });

  it("does NOT merge identical titles at different companies", () => {
    const differentCompany: Job = {
      ...sampleJob1,
      id: "prov1:other-001",
      externalId: "other-001",
      company: "SuperApp Technologies",
      originalUrl: "https://superapp.in/careers/react-dev",
    };

    const report = deduplicateJobs([sampleJob1, differentCompany]);
    expect(report.uniqueJobs).toHaveLength(2);
    expect(report.duplicateCount).toBe(0);
  });

  it("does NOT merge the same title at the same company across different cities", () => {
    const puneOpening: Job = {
      ...sampleJob1,
      id: "prov1:job-103",
      externalId: "job-103",
      normalizedCity: "Pune",
      originalLocation: "Pune, Maharashtra",
      originalUrl: "https://innovatetech.com/careers/103",
    };

    const report = deduplicateJobs([sampleJob1, puneOpening]);
    expect(report.uniqueJobs).toHaveLength(2);
    expect(report.duplicateCount).toBe(0);
  });
});
