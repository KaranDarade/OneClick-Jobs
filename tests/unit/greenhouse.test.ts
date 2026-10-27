import { describe, it, expect, vi, beforeEach } from "vitest";
import { GreenhouseClient, VETTED_GREENHOUSE_COMPANIES } from "@/server/providers/greenhouse/client";

describe("GreenhouseClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("has pre-configured verified India tech employer boards", () => {
    expect(VETTED_GREENHOUSE_COMPANIES.length).toBeGreaterThanOrEqual(8);
    const slugs = VETTED_GREENHOUSE_COMPANIES.map((c) => c.slug);
    expect(slugs).toContain("stripe");
    expect(slugs).toContain("mongodb");
    expect(slugs).toContain("databricks");
    expect(slugs).toContain("inmobi");
  });

  it("filters jobs to India locations only and normalizes fields", async () => {
    const mockBoardData = {
      jobs: [
        {
          id: 101,
          title: "Senior Backend Engineer",
          absolute_url: "https://stripe.com/jobs/101",
          location: { name: "Bangalore, India" },
          first_published: "2026-10-15T10:00:00Z",
        },
        {
          id: 102,
          title: "Staff Product Designer",
          absolute_url: "https://stripe.com/jobs/102",
          location: { name: "San Francisco, CA" }, // Non-India, should be filtered out
          first_published: "2026-10-14T10:00:00Z",
        },
        {
          id: 103,
          title: "Data Platform Lead",
          absolute_url: "https://stripe.com/jobs/103",
          location: { name: "Bengaluru" }, // Alias for Bangalore, should be included
          first_published: "2026-10-16T12:00:00Z",
        },
      ],
    };

    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => mockBoardData,
    } as unknown as Response);

    const client = new GreenhouseClient();
    const jobs = await client.fetchCompanyJobs("stripe", "Stripe");

    expect(jobs).toHaveLength(2);
    expect(jobs[0].id).toBe("greenhouse:stripe-101");
    expect(jobs[0].title).toBe("Senior Backend Engineer");
    expect(jobs[0].company).toBe("Stripe");
    expect(jobs[0].country).toBe("India");
    expect(jobs[0].normalizedCity).toBe("Bengaluru");
    expect(jobs[0].isDemo).toBe(false);

    expect(jobs[1].id).toBe("greenhouse:stripe-103");
    expect(jobs[1].normalizedCity).toBe("Bengaluru");
  });

  it("returns cached board jobs on subsequent calls", async () => {
    const mockBoardData = {
      jobs: [
        {
          id: 201,
          title: "Frontend Engineer",
          absolute_url: "https://mongodb.com/jobs/201",
          location: { name: "Gurgaon, India" },
          first_published: "2026-10-20T10:00:00Z",
        },
      ],
    };

    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => mockBoardData,
    } as unknown as Response);

    const client = new GreenhouseClient();
    const firstCall = await client.fetchCompanyJobs("mongodb", "MongoDB");
    const secondCall = await client.fetchCompanyJobs("mongodb", "MongoDB");

    expect(firstCall).toHaveLength(1);
    expect(secondCall).toHaveLength(1);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("handles empty or network errors gracefully with failure isolation", async () => {
    vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("Network timeout"));

    const client = new GreenhouseClient();
    const jobs = await client.fetchCompanyJobs("failing-company", "Failing Co");
    expect(jobs).toEqual([]);
  });

  it("fetches single job details and strips HTML description", async () => {
    const mockDetail = {
      id: 888,
      title: "Solutions Architect",
      company_name: "Twilio",
      absolute_url: "https://boards.greenhouse.io/twilio/jobs/888",
      location: { name: "Bengaluru, India" },
      content: "<div><p>We are seeking a <strong>Solutions Architect</strong> in Bengaluru.&nbsp;Apply today!</p></div>",
      first_published: "2026-10-18T00:00:00Z",
    };

    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => mockDetail,
    } as unknown as Response);

    const client = new GreenhouseClient();
    const job = await client.getJobById("twilio-888");

    expect(job).not.toBeNull();
    expect(job?.id).toBe("greenhouse:twilio-888");
    expect(job?.title).toBe("Solutions Architect");
    expect(job?.description).toContain("We are seeking a Solutions Architect in Bengaluru. Apply today!");
    expect(job?.description).not.toContain("<div>");
    expect(job?.description).not.toContain("&nbsp;");
  });
});
