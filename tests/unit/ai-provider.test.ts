import { describe, it, expect } from "vitest";
import { DeterministicFallbackProvider, getAIProvider } from "@/server/ai/provider";
import { Job } from "@/types/job";
import { CompatibilityScoreResult } from "@/types/matching";

describe("AI Match Analysis Provider", () => {
  const mockJob: Job = {
    id: "demo:test-eng",
    providerId: "demo",
    externalId: "test-eng",
    title: "Full Stack Engineer",
    company: "Razorpay",
    companyLogoUrl: null,
    originalUrl: "https://example.com",
    sourceAttribution: "Razorpay Careers",
    originalLocation: "Bengaluru, Karnataka",
    normalizedCity: "Bengaluru",
    normalizedState: "Karnataka",
    country: "India",
    workArrangement: "hybrid",
    remoteEligibility: null,
    employmentType: "full-time",
    experienceRange: { minYears: 3, maxYears: 6 },
    experienceLevel: "mid",
    requiredSkills: ["React", "Node.js", "TypeScript"],
    preferredSkills: ["PostgreSQL"],
    requiredQualifications: [],
    preferredQualifications: [],
    description: "React, Node.js, and TypeScript engineer",
    responsibilities: [],
    salaryMin: 1800000,
    salaryMax: 3000000,
    salaryCurrency: "INR",
    salaryPeriod: "yearly",
    postedAt: "2026-10-27T10:00:00Z",
    firstSeenAt: "2026-10-27T10:00:00Z",
    lastSeenAt: "2026-10-27T10:00:00Z",
    lastRefreshedAt: "2026-10-27T10:00:00Z",
    status: "active",
    providerMeta: {},
  };

  const mockCandidate = {
    skills: ["React", "TypeScript", "Next.js"],
    experienceYears: 4,
    preferredArrangement: "hybrid",
  };

  const mockBreakdown: CompatibilityScoreResult = {
    algorithmVersion: "1.0.0-rule-based",
    overallScore: 82,
    status: "scored",
    summaryText: "Strong compatibility (82%) with requirements.",
    matchingRequiredSkills: ["React", "TypeScript"],
    missingRequiredSkills: ["Node.js"],
    matchingPreferredSkills: ["PostgreSQL"],
    components: {
      requiredSkills: { score: 41, maxWeight: 50, effectiveWeight: 50, status: "available", explanation: "Matched 2 of 3 skills" },
      preferredSkills: { score: 20, maxWeight: 20, effectiveWeight: 20, status: "available", explanation: "Matched 1 preferred skill" },
      experience: { score: 20, maxWeight: 20, effectiveWeight: 20, status: "available", explanation: "Exceeds 3 yrs" },
      workArrangement: { score: 10, maxWeight: 10, effectiveWeight: 10, status: "available", explanation: "Matches hybrid" },
    },
    warnings: [],
  };

  it("generates structured match insights with deterministic fallback", async () => {
    const provider = new DeterministicFallbackProvider();
    const analysis = await provider.generateMatchExplanation(mockJob, mockCandidate, mockBreakdown);

    expect(analysis.fitSummary).toContain("Razorpay");
    expect(analysis.fitSummary).toContain("82%");
    expect(analysis.strengths.length).toBeGreaterThan(0);
    expect(analysis.growthAreas.length).toBeGreaterThan(0);
    expect(analysis.interviewTips.length).toBeGreaterThan(1);
    expect(analysis.coverLetterStarter).toContain("Razorpay Hiring Team");
    expect(analysis.coverLetterStarter).toContain("Full Stack Engineer");
    expect(analysis.isAiGenerated).toBe(false);
    expect(analysis.model).toBe("deterministic-rules-v1");
  });

  it("handles low match candidate profiles with constructive growth areas", async () => {
    const provider = new DeterministicFallbackProvider();
    const lowMatchBreakdown: CompatibilityScoreResult = {
      ...mockBreakdown,
      overallScore: 35,
      matchingRequiredSkills: [],
      missingRequiredSkills: ["React", "Node.js", "TypeScript"],
      matchingPreferredSkills: [],
    };

    const analysis = await provider.generateMatchExplanation(
      mockJob,
      { skills: ["Python"] },
      lowMatchBreakdown
    );

    expect(analysis.fitSummary).toContain("Growth opportunity");
    expect(analysis.growthAreas.some((g) => g.includes("React") || g.includes("Node.js"))).toBe(true);
  });

  it("factory returns valid AI provider instance", () => {
    const provider = getAIProvider();
    expect(provider).toBeDefined();
    expect(typeof provider.generateMatchExplanation).toBe("function");
  });
});
