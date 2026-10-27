import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryJobRepository } from "@/server/db/repository";
import { Job } from "@/types/job";

describe("InMemoryJobRepository", () => {
  let repo: InMemoryJobRepository;

  const mockJob: Job = {
    id: "test:001",
    providerId: "test",
    externalId: "001",
    title: "Senior Full Stack Engineer",
    company: "Acme India",
    companyLogoUrl: null,
    originalUrl: "https://example.com/job/001",
    sourceAttribution: "Acme Careers",
    originalLocation: "Bengaluru, Karnataka",
    normalizedCity: "Bengaluru",
    normalizedState: "Karnataka",
    country: "India",
    workArrangement: "hybrid",
    remoteEligibility: null,
    employmentType: "full-time",
    experienceRange: { minYears: 4, maxYears: 8 },
    experienceLevel: "senior",
    requiredSkills: ["React", "Node.js", "TypeScript"],
    preferredSkills: ["PostgreSQL"],
    requiredQualifications: [],
    preferredQualifications: [],
    description: "React and Node.js developer needed",
    responsibilities: [],
    salaryMin: 2000000,
    salaryMax: 3500000,
    salaryCurrency: "INR",
    salaryPeriod: "yearly",
    postedAt: "2026-10-27T10:00:00Z",
    firstSeenAt: "2026-10-27T10:00:00Z",
    lastSeenAt: "2026-10-27T10:00:00Z",
    lastRefreshedAt: "2026-10-27T10:00:00Z",
    status: "active",
    providerMeta: {},
  };

  beforeEach(() => {
    repo = new InMemoryJobRepository(false);
  });

  it("inserts and updates jobs correctly", async () => {
    const insertRes = await repo.upsertJobs([mockJob]);
    expect(insertRes.inserted).toBe(1);
    expect(insertRes.updated).toBe(0);

    const fetched = await repo.getJobById("test:001");
    expect(fetched).not.toBeNull();
    expect(fetched?.title).toBe("Senior Full Stack Engineer");

    // Upsert same job with title update
    const updateRes = await repo.upsertJobs([{ ...mockJob, title: "Staff Full Stack Engineer" }]);
    expect(updateRes.inserted).toBe(0);
    expect(updateRes.updated).toBe(1);

    const updatedFetched = await repo.getJobById("test:001");
    expect(updatedFetched?.title).toBe("Staff Full Stack Engineer");
  });

  it("queries jobs by keywords, locations, arrangements and skills", async () => {
    await repo.upsertJobs([
      mockJob,
      {
        ...mockJob,
        id: "test:002",
        title: "Frontend Developer",
        normalizedCity: "Hyderabad",
        originalLocation: "Hyderabad",
        workArrangement: "remote",
        requiredSkills: ["React", "CSS"],
        preferredSkills: [],
      },
    ]);

    // Query by keyword
    const qRes = await repo.queryJobs({ query: "Senior" });
    expect(qRes.total).toBe(1);
    expect(qRes.jobs[0].id).toBe("test:001");

    // Query by location
    const locRes = await repo.queryJobs({ location: "Hyderabad" });
    expect(locRes.total).toBe(1);
    expect(locRes.jobs[0].id).toBe("test:002");

    // Query by work arrangement
    const remoteRes = await repo.queryJobs({ workArrangement: "remote" });
    expect(remoteRes.total).toBe(1);
    expect(remoteRes.jobs[0].id).toBe("test:002");

    // Query by skill
    const skillRes = await repo.queryJobs({ skills: ["Node.js"] });
    expect(skillRes.total).toBe(1);
    expect(skillRes.jobs[0].id).toBe("test:001");
  });

  it("records and retrieves sync run audit logs", async () => {
    const record = await repo.recordSyncRun({
      sourceId: "greenhouse",
      status: "success",
      jobsFound: 150,
      jobsInserted: 140,
      jobsUpdated: 10,
      durationMs: 820,
    });

    expect(record.id).toBeDefined();
    expect(record.createdAt).toBeDefined();

    const runs = await repo.getLatestSyncRuns(5);
    expect(runs.length).toBe(1);
    expect(runs[0].sourceId).toBe("greenhouse");
    expect(runs[0].jobsFound).toBe(150);
  });
});
