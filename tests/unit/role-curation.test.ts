import { describe, it, expect } from "vitest";
import { classifyRoleCategory, extractSkillsFromResume } from "@/server/resume/skills";
import { inferRoleCategory } from "@/server/jobs/normalize";
import { filterAndSortJobs } from "@/features/job-search/search";
import { Job, SearchFilters } from "@/types/job";

describe("Deep Resume Role Classification & Auto-Curation", () => {
  it("classifies frontend developer resume accurately", () => {
    const skills = ["React", "TypeScript", "Tailwind CSS", "Next.js", "HTML/CSS"];
    const text = "Experienced Frontend Engineer building responsive web applications in React and Next.js.";
    const result = classifyRoleCategory(skills, text);

    expect(result.primary).toBe("Frontend");
  });

  it("classifies backend developer resume accurately", () => {
    const skills = ["Node.js", "PostgreSQL", "Python", "Redis", "Kafka"];
    const text = "Backend Developer focused on high-throughput microservices and REST APIs.";
    const result = classifyRoleCategory(skills, text);

    expect(result.primary).toBe("Backend");
  });

  it("classifies full stack developer when both frontend and backend skills exist", () => {
    const skills = ["React", "TypeScript", "Node.js", "PostgreSQL", "MongoDB"];
    const text = "Full Stack Software Developer shipping end-to-end features.";
    const result = classifyRoleCategory(skills, text);

    expect(result.primary).toBe("Full Stack");
  });

  it("classifies mobile developer resume accurately", () => {
    const skills = ["React Native", "Flutter", "Android", "iOS"];
    const text = "Mobile App Developer with 4 years building cross-platform apps.";
    const result = classifyRoleCategory(skills, text);

    expect(result.primary).toBe("Mobile");
  });

  it("classifies devops engineer resume accurately", () => {
    const skills = ["AWS", "Docker", "Kubernetes", "Terraform", "CI/CD"];
    const text = "DevOps Engineer maintaining Kubernetes clusters and cloud infrastructure.";
    const result = classifyRoleCategory(skills, text);

    expect(result.primary).toBe("DevOps & Cloud");
  });

  it("infers role categories from job titles and skills", () => {
    expect(inferRoleCategory("Senior Frontend Engineer", ["React"])).toBe("Frontend");
    expect(inferRoleCategory("Staff Backend Architect", ["Golang"])).toBe("Backend");
    expect(inferRoleCategory("Lead SRE / DevOps", ["Kubernetes"])).toBe("DevOps & Cloud");
    expect(inferRoleCategory("iOS Engineer", ["Swift"])).toBe("Mobile");
    expect(inferRoleCategory("Data Scientist II", ["Python", "Machine Learning"])).toBe("Data & AI");
  });

  it("filters jobs by roleCategory in search engine", () => {
    const sampleJobs: Job[] = [
      {
        id: "test:fe-1",
        providerId: "test",
        externalId: "fe-1",
        title: "Frontend Developer",
        company: "Alpha",
        companyLogoUrl: null,
        originalUrl: "https://alpha.com/jobs/1",
        sourceAttribution: "Alpha Direct",
        originalLocation: "Bengaluru",
        normalizedCity: "Bengaluru",
        normalizedState: "Karnataka",
        country: "India",
        workArrangement: "on-site",
        remoteEligibility: null,
        employmentType: "full-time",
        experienceRange: null,
        experienceLevel: "mid",
        requiredSkills: ["React"],
        preferredSkills: [],
        requiredQualifications: [],
        preferredQualifications: [],
        description: "Frontend role",
        responsibilities: [],
        salaryMin: null,
        salaryMax: null,
        salaryCurrency: "INR",
        salaryPeriod: "yearly",
        postedAt: new Date().toISOString(),
        firstSeenAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
        lastRefreshedAt: new Date().toISOString(),
        status: "active",
        providerMeta: {},
        roleCategory: "Frontend",
      },
      {
        id: "test:be-1",
        providerId: "test",
        externalId: "be-1",
        title: "Backend Engineer",
        company: "Beta",
        companyLogoUrl: null,
        originalUrl: "https://beta.com/jobs/2",
        sourceAttribution: "Beta Direct",
        originalLocation: "Bengaluru",
        normalizedCity: "Bengaluru",
        normalizedState: "Karnataka",
        country: "India",
        workArrangement: "remote",
        remoteEligibility: null,
        employmentType: "full-time",
        experienceRange: null,
        experienceLevel: "senior",
        requiredSkills: ["Python", "PostgreSQL"],
        preferredSkills: [],
        requiredQualifications: [],
        preferredQualifications: [],
        description: "Backend role",
        responsibilities: [],
        salaryMin: null,
        salaryMax: null,
        salaryCurrency: "INR",
        salaryPeriod: "yearly",
        postedAt: new Date().toISOString(),
        firstSeenAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
        lastRefreshedAt: new Date().toISOString(),
        status: "active",
        providerMeta: {},
        roleCategory: "Backend",
      },
    ];

    const frontendFilter: SearchFilters = {
      query: "",
      location: "All India",
      workArrangements: [],
      experienceLevels: [],
      employmentTypes: [],
      roleCategories: ["Frontend"],
      postingAge: null,
      sortBy: "relevance",
    };

    const res = filterAndSortJobs(frontendFilter, sampleJobs);
    expect(res.totalCount).toBe(1);
    expect(res.jobs[0].title).toBe("Frontend Developer");
  });

  it("extracts projects and education from resume text", () => {
    const resumeText = `
John Doe
Email: john@example.com
Phone: +91 9876543210

Education:
B.Tech in Computer Science and Engineering, 2024

Technical Skills:
React, TypeScript, Next.js, Node.js, Tailwind CSS, PostgreSQL

Key Projects:
- E-Commerce Marketplace (React, Next.js, PostgreSQL):
  Developed full-featured multi-vendor shop with stripe payment integration.
- Realtime Chat App (Node.js, Redis, WebSockets):
  Built low-latency chat service supporting 10,000 concurrent socket connections.

Work Experience:
Software Engineer Intern at Acme Corp (6 months)
`;

    const result = extractSkillsFromResume(resumeText);
    expect(result.detectedRoleCategory).toBe("Full Stack");
    expect(result.educationHint).toContain("B.TECH");
    expect(result.projects.length).toBeGreaterThanOrEqual(1);
    expect(result.projects[0].title).toContain("E-Commerce");
  });
});
