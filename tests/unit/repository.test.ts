import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryJobRepository } from "@/server/db/repository";
import { Job } from "@/types/job";

describe("InMemoryJobRepository", () => {
  let repo: InMemoryJobRepository;

  const mockJob: Job = {
    id: "test:001",
    title: "Senior Full Stack Engineer",
    company: "Acme India",
    companySlug: "acme",
    locationRaw: "Bengaluru, Karnataka",
    city: "Bengaluru",
    country: "India",
    isRemote: false,
    workArrangement: "Hybrid",
    descriptionHtml: "<p>React and Node.js</p>",
    descriptionText: "React and Node.js developer needed",
    url: "https://example.com/job/001",
    source: "test",
    provider: "greenhouse",
    postedAt: "2026-10-27T10:00:00Z",
    extractedSkills: ["React", "Node.js", "TypeScript"],
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
        city: "Hyderabad",
        locationRaw: "Hyderabad",
        isRemote: true,
        workArrangement: "Remote",
        extractedSkills: ["React", "CSS"],
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
    const remoteRes = await repo.queryJobs({ workArrangement: "Remote" });
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
