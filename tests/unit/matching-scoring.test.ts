import { describe, it, expect } from "vitest";
import { calculateJobCompatibility } from "@/server/matching/scoring";
import { CandidateProfile } from "@/types/matching";
import { Job } from "@/types/job";

describe("Deterministic Compatibility Scoring Algorithm", () => {
  const baseCandidate: CandidateProfile = {
    id: "cand-1",
    extractedSkills: ["React", "TypeScript", "Node.js", "Tailwind CSS"],
    userSkills: ["React", "TypeScript", "Node.js", "Tailwind CSS"],
    experienceYears: 4,
    experienceLevelHint: "mid",
    preferredArrangements: ["remote", "hybrid"],
    parsedAt: new Date().toISOString(),
    parsingWarnings: [],
  };

  const baseJob: Job = {
    id: "job-1",
    providerId: "demo",
    externalId: "ext-1",
    title: "Senior Full Stack Engineer",
    company: "Acme Tech",
    companyLogoUrl: null,
    originalUrl: "https://example.com/jobs/1",
    sourceAttribution: "Acme",
    originalLocation: "Bengaluru",
    normalizedCity: "Bengaluru",
    normalizedState: "Karnataka",
    country: "India",
    workArrangement: "remote",
    remoteEligibility: "India Remote",
    employmentType: "full-time",
    experienceRange: { minYears: 3, maxYears: 6 },
    experienceLevel: "mid",
    requiredSkills: ["React", "TypeScript", "Node.js"],
    preferredSkills: ["Tailwind CSS", "PostgreSQL"],
    requiredQualifications: [],
    preferredQualifications: [],
    description: "Build modern web apps",
    responsibilities: [],
    salaryMin: 2000000,
    salaryMax: 3000000,
    salaryCurrency: "INR",
    salaryPeriod: "yearly",
    postedAt: "2026-10-20T00:00:00Z",
    firstSeenAt: "2026-10-20T00:00:00Z",
    lastSeenAt: "2026-10-20T00:00:00Z",
    lastRefreshedAt: "2026-10-20T00:00:00Z",
    status: "active",
    providerMeta: {},
  };

  it("calculates high score when required skills, preferred skills, experience, and arrangement match", () => {
    const result = calculateJobCompatibility(baseCandidate, baseJob);

    expect(result.status).toBe("scored");
    expect(result.overallScore).toBeGreaterThanOrEqual(80);
    expect(result.overallScore).toBeLessThanOrEqual(100);
    expect(result.matchingRequiredSkills).toEqual(["React", "TypeScript", "Node.js"]);
    expect(result.missingRequiredSkills).toHaveLength(0);
    expect(result.matchingPreferredSkills).toEqual(["Tailwind CSS"]);
  });

  it("penalizes missing required skills proportionally", () => {
    const candidateMissingSkills: CandidateProfile = {
      ...baseCandidate,
      userSkills: ["React"], // Has only 1 of 3 required skills
    };

    const result = calculateJobCompatibility(candidateMissingSkills, baseJob);
    expect(result.matchingRequiredSkills).toEqual(["React"]);
    expect(result.missingRequiredSkills).toContain("TypeScript");
    expect(result.missingRequiredSkills).toContain("Node.js");
    expect(result.overallScore).toBeLessThan(60);
  });

  it("redistributes weights proportionally when preferred skills are absent in job", () => {
    const jobNoPreferred: Job = {
      ...baseJob,
      preferredSkills: [], // Unspecified preferred skills
    };

    const result = calculateJobCompatibility(baseCandidate, jobNoPreferred);

    // Preferred skills is unavailable, its weight is distributed across required (50), experience (20), arrangement (10)
    expect(result.components.preferredSkills.status).toBe("unavailable");
    expect(result.components.requiredSkills.effectiveWeight).toBeGreaterThan(50);
    expect(result.overallScore).toBe(100); // Has all 3 required, experience matches, arrangement matches
  });

  it("redistributes weights proportionally when candidate or job experience is unknown", () => {
    const candidateUnknownExp: CandidateProfile = {
      ...baseCandidate,
      experienceYears: null,
    };

    const result = calculateJobCompatibility(candidateUnknownExp, baseJob);
    expect(result.components.experience.status).toBe("unavailable");
    expect(result.components.requiredSkills.effectiveWeight).toBeGreaterThan(50);
    expect(result.status).toBe("scored");
    expect(result.overallScore).toBeDefined();
  });

  it("awards 0 points for work arrangement on total mismatch", () => {
    const candidateOnsiteOnly: CandidateProfile = {
      ...baseCandidate,
      preferredArrangements: ["on-site"],
    };
    const remoteOnlyJob: Job = {
      ...baseJob,
      workArrangement: "remote",
    };

    const result = calculateJobCompatibility(candidateOnsiteOnly, remoteOnlyJob);
    expect(result.components.workArrangement.score).toBe(0);
    expect(result.components.workArrangement.explanation).toContain("mismatch");
  });

  it("returns insufficient_data when neither skills nor experience can be evaluated", () => {
    const bareJob: Job = {
      ...baseJob,
      requiredSkills: [],
      preferredSkills: [],
      experienceRange: null,
      workArrangement: "unknown",
    };

    const result = calculateJobCompatibility(baseCandidate, bareJob);
    expect(result.status).toBe("insufficient_data");
    expect(result.overallScore).toBeNull();
  });

  it("is strictly deterministic (identical output for identical input)", () => {
    const res1 = calculateJobCompatibility(baseCandidate, baseJob);
    const res2 = calculateJobCompatibility(baseCandidate, baseJob);

    expect(res1.overallScore).toBe(res2.overallScore);
    expect(res1.summaryText).toBe(res2.summaryText);
    expect(res1.matchingRequiredSkills).toEqual(res2.matchingRequiredSkills);
  });
});
