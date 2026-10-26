import { describe, it, expect } from "vitest";
import { filterAndSortJobs, getJobById } from "@/features/job-search/search";
import { DEMO_JOBS } from "@/features/job-search/fixtures";
import { SearchFilters, Job } from "@/types/job";

const defaultFilters: SearchFilters = {
  query: "",
  location: "All India",
  workArrangements: [],
  experienceLevels: [],
  employmentTypes: [],
  postingAge: null,
  sortBy: "relevance",
};

describe("OneClick Jobs — Search & Filter Engine", () => {
  it("should return all 35 demo jobs with default filters", () => {
    const result = filterAndSortJobs(defaultFilters);
    expect(result.totalCount).toBe(DEMO_JOBS.length);
    expect(result.totalCount).toBe(35);
  });

  it("should filter by role title or keyword case-insensitively", () => {
    const result = filterAndSortJobs({
      ...defaultFilters,
      query: "python",
    });
    expect(result.totalCount).toBeGreaterThan(0);
    result.jobs.forEach((job) => {
      const match =
        job.title.toLowerCase().includes("python") ||
        job.requiredSkills.some((s) => s.toLowerCase().includes("python")) ||
        job.description.toLowerCase().includes("python");
      expect(match).toBe(true);
    });
  });

  it("should filter by location alias (e.g. Bangalore for Bengaluru)", () => {
    const result = filterAndSortJobs({
      ...defaultFilters,
      location: "Bangalore",
    });
    expect(result.totalCount).toBeGreaterThan(0);
    result.jobs.forEach((job) => {
      const city = (job.normalizedCity || "").toLowerCase();
      const orig = (job.originalLocation || "").toLowerCase();
      expect(city.includes("bengaluru") || orig.includes("bangalore")).toBe(true);
    });
  });

  it("should filter by Delhi NCR covering Delhi, Noida, and Gurugram", () => {
    const result = filterAndSortJobs({
      ...defaultFilters,
      location: "Delhi NCR",
    });
    expect(result.totalCount).toBeGreaterThan(0);
    result.jobs.forEach((job) => {
      const city = (job.normalizedCity || "").toLowerCase();
      const isNCR =
        city.includes("delhi") ||
        city.includes("noida") ||
        city.includes("gurugram");
      expect(isNCR).toBe(true);
    });
  });

  it("should filter by work arrangement", () => {
    const result = filterAndSortJobs({
      ...defaultFilters,
      workArrangements: ["remote"],
    });
    expect(result.totalCount).toBeGreaterThan(0);
    result.jobs.forEach((job) => {
      expect(job.workArrangement).toBe("remote");
    });
  });

  it("should filter by experience level", () => {
    const result = filterAndSortJobs({
      ...defaultFilters,
      experienceLevels: ["internship", "fresher"],
    });
    expect(result.totalCount).toBeGreaterThan(0);
    result.jobs.forEach((job) => {
      expect(["internship", "fresher"]).toContain(job.experienceLevel);
    });
  });

  it("should handle combined filters accurately", () => {
    const result = filterAndSortJobs({
      ...defaultFilters,
      location: "Bengaluru",
      workArrangements: ["hybrid"],
    });
    expect(result.totalCount).toBeGreaterThan(0);
    result.jobs.forEach((job) => {
      expect(job.normalizedCity?.toLowerCase()).toContain("bengaluru");
      expect(job.workArrangement).toBe("hybrid");
    });
  });

  it("should return empty results for nonexistent queries", () => {
    const result = filterAndSortJobs({
      ...defaultFilters,
      query: "xyznonexistentjob123456",
    });
    expect(result.totalCount).toBe(0);
    expect(result.jobs).toHaveLength(0);
  });

  it("should sort deterministically by salary high-to-low", () => {
    const result = filterAndSortJobs({
      ...defaultFilters,
      sortBy: "salary-high",
    });
    expect(result.totalCount).toBeGreaterThan(0);
    for (let i = 0; i < result.jobs.length - 1; i++) {
      const salA = result.jobs[i].salaryMax || result.jobs[i].salaryMin || 0;
      const salB = result.jobs[i + 1].salaryMax || result.jobs[i + 1].salaryMin || 0;
      expect(salA).toBeGreaterThanOrEqual(salB);
    }
  });

  it("should handle posting age filter with deterministic reference date", () => {
    // Fixture jobs are dated 2026-10-12T10:00:00Z; test with a reference date within 24h
    const fixedNow = new Date("2026-10-12T20:00:00.000Z"); // 10 hours after posting
    const result24h = filterAndSortJobs(
      {
        ...defaultFilters,
        postingAge: "1",
      },
      undefined,
      fixedNow
    );
    expect(result24h.totalCount).toBeGreaterThan(0);
  });

  it("never mutates the input dataset during filtering or sorting", () => {
    const sampleSet: Job[] = [...DEMO_JOBS.slice(0, 5)];
    const cloneBefore = JSON.stringify(sampleSet);

    filterAndSortJobs(
      {
        ...defaultFilters,
        query: "Engineer",
        sortBy: "salary-high",
      },
      sampleSet
    );

    const cloneAfter = JSON.stringify(sampleSet);
    expect(cloneBefore).toBe(cloneAfter);
  });

  it("should retrieve a job by valid ID and return undefined for invalid ID", () => {
    const job = getJobById("demo:ind-001");
    expect(job).toBeDefined();
    expect(job?.title).toContain("Full Stack");

    const nonExistent = getJobById("demo:invalid-999");
    expect(nonExistent).toBeUndefined();
  });

  it("should not match a job when searching for 'java' solely because required skill is 'JavaScript'", () => {
    // Synthetic jobs: one with only JavaScript, one with Java
    const syntheticJsJob: Job = {
      ...DEMO_JOBS[0],
      id: "synthetic:js-only",
      title: "Frontend Architect",
      company: "Modern Web Ltd",
      description: "Developing modern web components.",
      requiredSkills: ["JavaScript", "HTML/CSS", "React"],
    };

    const syntheticJavaJob: Job = {
      ...DEMO_JOBS[0],
      id: "synthetic:java-only",
      title: "Enterprise Backend Architect",
      company: "Core Banking Systems",
      description: "Developing core banking engines.",
      requiredSkills: ["Java", "Spring Boot", "SQL"],
    };

    const result = filterAndSortJobs(
      { ...defaultFilters, query: "java" },
      [syntheticJsJob, syntheticJavaJob]
    );

    // Only the genuine Java role should match, NOT the JavaScript-only role
    expect(result.totalCount).toBe(1);
    expect(result.jobs[0].id).toBe("synthetic:java-only");
  });

  it("should include a job in Greater Noida when filtering for 'Delhi NCR'", () => {
    const syntheticGrNoidaJob: Job = {
      ...DEMO_JOBS[0],
      id: "synthetic:gr-noida-01",
      title: "Cloud Infrastructure Specialist",
      company: "NCR Digital Park",
      originalLocation: "Greater Noida, Knowledge Park III",
      normalizedCity: "Greater Noida",
      normalizedState: "Uttar Pradesh",
    };

    const result = filterAndSortJobs(
      { ...defaultFilters, location: "Delhi NCR" },
      [syntheticGrNoidaJob, DEMO_JOBS[0]] // DEMO_JOBS[0] is in Bengaluru
    );

    expect(result.totalCount).toBe(1);
    expect(result.jobs[0].id).toBe("synthetic:gr-noida-01");
    expect(result.jobs[0].normalizedCity).toBe("Greater Noida");
  });
});
