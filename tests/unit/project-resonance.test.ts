import { describe, it, expect } from "vitest";
import { calculateJobCompatibility } from "@/server/matching/scoring";
import { CandidateProfile } from "@/types/matching";
import { Job } from "@/types/job";

describe("Resume Projects & Keyword Resonance Boost", () => {
  const candidateWithReactProjects: CandidateProfile = {
    id: "cand-react-1",
    extractedSkills: ["React", "JavaScript", "HTML", "CSS"],
    userSkills: ["React", "JavaScript", "HTML", "CSS"],
    experienceYears: 0,
    experienceLevelHint: "fresher",
    isFresher: true,
    internshipExperience: true,
    projects: [
      {
        title: "E-Commerce Shopping Platform (MERN)",
        description: "Built full stack e-commerce web application using React.js, Node.js, Express, and MongoDB with Stripe payment integration.",
        technologies: ["React", "Node.js", "MongoDB", "Express"],
      },
      {
        title: "Personal Developer Portfolio",
        description: "Responsive portfolio built using Next.js, React, and Tailwind CSS.",
        technologies: ["Next.js", "React", "Tailwind CSS"],
      },
    ],
    preferredArrangements: ["remote", "hybrid", "on-site"],
    parsedAt: new Date().toISOString(),
    parsingWarnings: [],
  };

  const reactMernJob: Job = {
    id: "job-mern",
    providerId: "greenhouse",
    externalId: "m-1",
    title: "Junior MERN Stack Developer (React & Node.js)",
    company: "DevScale",
    companyLogoUrl: null,
    originalUrl: "https://boards.greenhouse.io/devscale/1",
    sourceAttribution: "Greenhouse",
    originalLocation: "Bengaluru",
    normalizedCity: "Bengaluru",
    normalizedState: "Karnataka",
    country: "India",
    workArrangement: "remote",
    remoteEligibility: "India Remote",
    employmentType: "full-time",
    experienceRange: { minYears: 0, maxYears: 1 },
    experienceLevel: "fresher",
    requiredSkills: ["React", "Node.js", "JavaScript"],
    preferredSkills: ["MongoDB", "Express"],
    requiredQualifications: [],
    preferredQualifications: [],
    description: "Looking for enthusiastic MERN developers with React projects.",
    responsibilities: [],
    salaryMin: 500000,
    salaryMax: 800000,
    salaryCurrency: "INR",
    salaryPeriod: "yearly",
    postedAt: "2026-11-12T00:00:00Z",
    firstSeenAt: "2026-11-12T00:00:00Z",
    lastSeenAt: "2026-11-12T00:00:00Z",
    lastRefreshedAt: "2026-11-12T00:00:00Z",
    status: "active",
    providerMeta: {},
  };

  const pythonJob: Job = {
    id: "job-python",
    providerId: "greenhouse",
    externalId: "p-1",
    title: "Junior Python Engineer",
    company: "PyCorp",
    companyLogoUrl: null,
    originalUrl: "https://boards.greenhouse.io/pycorp/1",
    sourceAttribution: "Greenhouse",
    originalLocation: "Bengaluru",
    normalizedCity: "Bengaluru",
    normalizedState: "Karnataka",
    country: "India",
    workArrangement: "remote",
    remoteEligibility: "India Remote",
    employmentType: "full-time",
    experienceRange: { minYears: 0, maxYears: 1 },
    experienceLevel: "fresher",
    requiredSkills: ["Python", "SQL"],
    preferredSkills: ["Django"],
    requiredQualifications: [],
    preferredQualifications: [],
    description: "Looking for junior Python backend engineers.",
    responsibilities: [],
    salaryMin: 500000,
    salaryMax: 800000,
    salaryCurrency: "INR",
    salaryPeriod: "yearly",
    postedAt: "2026-11-12T00:00:00Z",
    firstSeenAt: "2026-11-12T00:00:00Z",
    lastSeenAt: "2026-11-12T00:00:00Z",
    lastRefreshedAt: "2026-11-12T00:00:00Z",
    status: "active",
    providerMeta: {},
  };

  it("boosts React & MERN roles significantly when candidate has React projects", () => {
    const mernResult = calculateJobCompatibility(candidateWithReactProjects, reactMernJob);
    const pythonResult = calculateJobCompatibility(candidateWithReactProjects, pythonJob);

    expect(mernResult.status).toBe("scored");
    expect(pythonResult.status).toBe("scored");

    // The MERN job should score significantly higher due to skill overlap + project resonance boost
    expect(mernResult.overallScore).toBeGreaterThanOrEqual(85);
    expect(pythonResult.overallScore).toBeLessThan(50);
    expect((mernResult.overallScore || 0)).toBeGreaterThan((pythonResult.overallScore || 0) + 30);
  });
});
