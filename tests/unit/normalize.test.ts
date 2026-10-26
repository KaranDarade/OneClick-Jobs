import { describe, it, expect } from "vitest";
import {
  normalizeJob,
  normalizeWorkArrangement,
  normalizeExperienceLevel,
  validateIsoDate,
} from "@/server/jobs/normalize";

describe("Canonical Job Normalization", () => {
  it("normalizes a valid raw job correctly", () => {
    const raw = {
      providerId: "test-provider",
      externalId: "ext-123",
      title: "  Senior Frontend Engineer  ",
      company: "  Acme Corp  ",
      originalUrl: "https://example.com/jobs/123",
      originalLocation: "Bengaluru, Karnataka",
      workArrangement: "flexible hybrid",
      experienceLevel: "senior",
      requiredSkills: ["reactjs", "typescript", "tailwind"],
      salaryMin: 2000000,
      salaryMax: 3000000,
      postedAt: "2026-10-10T12:00:00Z",
    };

    const result = normalizeJob(raw);
    expect(result.success).toBe(true);
    expect(result.job).toBeDefined();

    const job = result.job!;
    expect(job.title).toBe("Senior Frontend Engineer");
    expect(job.company).toBe("Acme Corp");
    expect(job.normalizedCity).toBe("Bengaluru");
    expect(job.workArrangement).toBe("hybrid");
    expect(job.experienceLevel).toBe("senior");
    expect(job.requiredSkills).toEqual(["React", "TypeScript", "Tailwind CSS"]);
    expect(job.salaryMin).toBe(2000000);
    expect(job.salaryMax).toBe(3000000);
    expect(job.postedAt).toBe("2026-10-10T12:00:00.000Z");
  });

  it("returns structured errors and rejects invalid records missing required fields", () => {
    const invalid = {
      // Missing providerId, externalId, company, originalUrl
      title: "Software Engineer",
    };

    const result = normalizeJob(invalid);
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
  });

  it("rejects invalid URLs safely", () => {
    const invalidUrl = {
      providerId: "p1",
      externalId: "e1",
      title: "Dev",
      company: "Corp",
      originalUrl: "not-a-valid-url",
    };

    const result = normalizeJob(invalidUrl);
    expect(result.success).toBe(false);
    expect(result.errors?.some((e) => e.includes("originalUrl"))).toBe(true);
  });

  it("normalizes work arrangement aliases", () => {
    expect(normalizeWorkArrangement("Work from home")).toBe("remote");
    expect(normalizeWorkArrangement("wfh")).toBe("remote");
    expect(normalizeWorkArrangement("Onsite / Office")).toBe("on-site");
    expect(normalizeWorkArrangement("hybrid flexible")).toBe("hybrid");
    expect(normalizeWorkArrangement("unspecified/ambiguous")).toBe("unknown");
    expect(normalizeWorkArrangement(null)).toBe("unknown");
  });

  it("normalizes experience levels from strings and year hints", () => {
    expect(normalizeExperienceLevel("entry level")).toBe("fresher");
    expect(normalizeExperienceLevel("internship")).toBe("internship");
    expect(normalizeExperienceLevel("Lead Software Architect")).toBe("lead");
    expect(normalizeExperienceLevel(null, 0, 1)).toBe("fresher");
    expect(normalizeExperienceLevel(null, 5, 8)).toBe("senior");
    expect(normalizeExperienceLevel(null, null, null)).toBe("unknown");
  });

  it("validates ISO timestamps and rejects malformed dates", () => {
    expect(validateIsoDate("2026-05-15T10:00:00Z")).toBe("2026-05-15T10:00:00.000Z");
    expect(validateIsoDate("invalid-date-string")).toBeNull();
    expect(validateIsoDate("")).toBeNull();
    expect(validateIsoDate(null)).toBeNull();
  });

  it("corrects inverted salary ranges and discards negative numbers", () => {
    const raw = {
      providerId: "p1",
      externalId: "e1",
      title: "Dev",
      company: "Corp",
      originalUrl: "https://example.com/job/1",
      salaryMin: 3000000,
      salaryMax: 1500000, // inverted
    };
    const result = normalizeJob(raw);
    expect(result.success).toBe(true);
    expect(result.job?.salaryMin).toBe(1500000);
    expect(result.job?.salaryMax).toBe(3000000);
  });

  it("safely coerces negative salary values to null", () => {
    const rawNegative = {
      providerId: "p2",
      externalId: "e2",
      title: "Backend Engineer",
      company: "Corp",
      originalUrl: "https://example.com/job/2",
      salaryMin: -50000,
      salaryMax: -100000,
    };
    const result = normalizeJob(rawNegative);
    expect(result.success).toBe(true);
    expect(result.job?.salaryMin).toBeNull();
    expect(result.job?.salaryMax).toBeNull();
  });
});
