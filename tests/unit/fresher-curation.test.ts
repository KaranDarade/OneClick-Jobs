import { describe, it, expect } from "vitest";
import { filterAndSortJobs } from "@/features/job-search/search";
import { Job, SearchFilters } from "@/types/job";

describe("Strict Fresher Mode Curation", () => {
  const testJobs: Job[] = [
    {
      id: "job-fresher-1",
      providerId: "greenhouse",
      externalId: "f-1",
      title: "Graduate Software Engineer (Fresher)",
      company: "TechNova",
      companyLogoUrl: null,
      originalUrl: "https://boards.greenhouse.io/technova/jobs/1",
      sourceAttribution: "Greenhouse",
      originalLocation: "Bengaluru",
      normalizedCity: "Bengaluru",
      normalizedState: "Karnataka",
      country: "India",
      workArrangement: "on-site",
      remoteEligibility: null,
      employmentType: "full-time",
      experienceRange: { minYears: 0, maxYears: 1 },
      experienceLevel: "fresher",
      requiredSkills: ["JavaScript", "Python"],
      preferredSkills: [],
      requiredQualifications: [],
      preferredQualifications: [],
      description: "Looking for fresh graduates with strong problem solving skills.",
      responsibilities: [],
      salaryMin: 600000,
      salaryMax: 800000,
      salaryCurrency: "INR",
      salaryPeriod: "yearly",
      postedAt: "2026-11-10T00:00:00Z",
      firstSeenAt: "2026-11-10T00:00:00Z",
      lastSeenAt: "2026-11-10T00:00:00Z",
      lastRefreshedAt: "2026-11-10T00:00:00Z",
      status: "active",
      providerMeta: {},
    },
    {
      id: "job-intern-2",
      providerId: "lever",
      externalId: "i-2",
      title: "Frontend Engineering Intern",
      company: "CloudScale",
      companyLogoUrl: null,
      originalUrl: "https://jobs.lever.co/cloudscale/2",
      sourceAttribution: "Lever",
      originalLocation: "Pune",
      normalizedCity: "Pune",
      normalizedState: "Maharashtra",
      country: "India",
      workArrangement: "remote",
      remoteEligibility: "India Remote",
      employmentType: "internship",
      experienceRange: { minYears: 0, maxYears: 0 },
      experienceLevel: "internship",
      requiredSkills: ["React", "HTML", "CSS"],
      preferredSkills: [],
      requiredQualifications: [],
      preferredQualifications: [],
      description: "6-month internship for enthusiastic frontend developers.",
      responsibilities: [],
      salaryMin: 300000,
      salaryMax: 400000,
      salaryCurrency: "INR",
      salaryPeriod: "yearly",
      postedAt: "2026-11-11T00:00:00Z",
      firstSeenAt: "2026-11-11T00:00:00Z",
      lastSeenAt: "2026-11-11T00:00:00Z",
      lastRefreshedAt: "2026-11-11T00:00:00Z",
      status: "active",
      providerMeta: {},
    },
    {
      id: "job-senior-3",
      providerId: "greenhouse",
      externalId: "s-3",
      title: "Staff Backend Engineer",
      company: "EnterpriseCorp",
      companyLogoUrl: null,
      originalUrl: "https://boards.greenhouse.io/enterprisecorp/3",
      sourceAttribution: "Greenhouse",
      originalLocation: "Bengaluru",
      normalizedCity: "Bengaluru",
      normalizedState: "Karnataka",
      country: "India",
      workArrangement: "hybrid",
      remoteEligibility: null,
      employmentType: "full-time",
      experienceRange: { minYears: 6, maxYears: 10 },
      experienceLevel: "senior",
      requiredSkills: ["Go", "Kubernetes", "PostgreSQL"],
      preferredSkills: [],
      requiredQualifications: [],
      preferredQualifications: [],
      description: "Lead critical backend distributed systems.",
      responsibilities: [],
      salaryMin: 3500000,
      salaryMax: 5000000,
      salaryCurrency: "INR",
      salaryPeriod: "yearly",
      postedAt: "2026-11-12T00:00:00Z",
      firstSeenAt: "2026-11-12T00:00:00Z",
      lastSeenAt: "2026-11-12T00:00:00Z",
      lastRefreshedAt: "2026-11-12T00:00:00Z",
      status: "active",
      providerMeta: {},
    },
  ];

  it("filters out senior roles and returns only fresher/intern roles when isFresherOnly is true", () => {
    const filters: SearchFilters = {
      query: "",
      location: "all",
      workArrangements: [],
      experienceLevels: [],
      employmentTypes: [],
      isFresherOnly: true,
      postingAge: null,
      sortBy: "relevance",
    };

    const result = filterAndSortJobs(filters, testJobs);

    expect(result.totalCount).toBe(2);
    expect(result.jobs.map((j) => j.id)).toEqual(["job-intern-2", "job-fresher-1"]);
    expect(result.jobs.some((j) => j.id === "job-senior-3")).toBe(false);
  });

  it("returns all roles when isFresherOnly is false", () => {
    const filters: SearchFilters = {
      query: "",
      location: "all",
      workArrangements: [],
      experienceLevels: [],
      employmentTypes: [],
      isFresherOnly: false,
      postingAge: null,
      sortBy: "relevance",
    };

    const result = filterAndSortJobs(filters, testJobs);

    expect(result.totalCount).toBe(3);
    expect(result.jobs.some((j) => j.id === "job-senior-3")).toBe(true);
  });
});
