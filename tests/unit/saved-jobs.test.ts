import { describe, it, expect, beforeEach } from "vitest";
import { filterAndSortJobs } from "@/features/job-search/search";
import { DEMO_JOBS } from "@/features/job-search/fixtures";
import { formatShortDate, getJobSourceAttribution } from "@/lib/utils";
import { Job, SearchFilters } from "@/types/job";

describe("Saved Jobs & New UI Utilities", () => {
  it("formats short date correctly for table display", () => {
    expect(formatShortDate("2026-11-16T10:00:00Z")).toBe("16 Nov");
    expect(formatShortDate("2026-11-14T08:30:00Z")).toBe("14 Nov");
    expect(formatShortDate("2026-01-05T12:00:00Z")).toBe("5 Jan");
    expect(formatShortDate(null)).toBe("Recent");
  });

  it("determines source attribution accurately", () => {
    expect(
      getJobSourceAttribution({
        source: "linkedin",
        sourceUrl: "https://www.linkedin.com/jobs/view/123",
      })
    ).toBe("via Linkedin");

    expect(
      getJobSourceAttribution({
        source: "indeed",
        sourceUrl: "https://in.indeed.com/viewjob?jk=abc",
      })
    ).toBe("via Indeed");

    expect(
      getJobSourceAttribution({
        source: "greenhouse",
        sourceUrl: "https://boards.greenhouse.io/company/jobs/456",
      })
    ).toBe("via Greenhouse");

    expect(
      getJobSourceAttribution({
        source: "direct",
        sourceUrl: "https://careers.company.com/job/789",
      })
    ).toBe("via Company's Career Page");
  });

  it("filters jobs with multi-city checkbox selection (e.g. Pune and Bengaluru)", () => {
    const filters: SearchFilters = {
      query: "",
      location: "All India",
      selectedCities: ["Pune", "Bengaluru"],
      workArrangements: [],
      experienceLevels: [],
      employmentTypes: [],
      postingAge: null,
      sortBy: "relevance",
    };

    const result = filterAndSortJobs(filters, DEMO_JOBS);
    expect(result.jobs.length).toBeGreaterThan(0);
    result.jobs.forEach((job) => {
      expect(["Pune", "Bengaluru"]).toContain(job.normalizedCity);
    });
  });

  it("filters jobs strictly when only Pune is checked", () => {
    const filters: SearchFilters = {
      query: "",
      location: "All India",
      selectedCities: ["Pune"],
      workArrangements: [],
      experienceLevels: [],
      employmentTypes: [],
      postingAge: null,
      sortBy: "relevance",
    };

    const result = filterAndSortJobs(filters, DEMO_JOBS);
    result.jobs.forEach((job) => {
      expect(job.normalizedCity).toBe("Pune");
    });
  });
});
