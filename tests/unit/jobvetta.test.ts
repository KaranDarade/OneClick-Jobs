import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { JobvettaClient } from "@/server/providers/jobvetta/client";

describe("Jobvetta Provider Client", () => {
  const fakeApiKey = "test_key_123456789";
  let client: JobvettaClient;

  beforeEach(() => {
    client = new JobvettaClient(fakeApiKey, "https://api.jobvetta.com/v1");
    client.clearCache();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("handles missing credentials gracefully without throwing", async () => {
    const unconfigured = new JobvettaClient("", "https://api.jobvetta.com/v1");
    expect(unconfigured.isConfigured()).toBe(false);

    const result = await unconfigured.search({ q: "react" });
    expect(result.source).toBe("demo-fallback");
    expect(result.error).toContain("JOBVETTA_API_KEY is not configured");
    expect(result.jobs).toHaveLength(0);
  });

  it("successfully parses live search responses and normalizes records", async () => {
    const mockApiResponse = {
      total: 42,
      jobs: [
        {
          job_id: "jv_001",
          title: "Senior React Developer",
          company: "Infosys Labs",
          location: "Bangalore, Karnataka, India",
          work_model: "Hybrid",
          employment_type: "Full-time",
          url: "https://www.jobvetta.com/jobs/jv_001",
        },
      ],
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: (header: string) => {
          if (header === "X-RateLimit-Limit") return "50";
          if (header === "X-RateLimit-Remaining") return "47";
          return null;
        },
      },
      json: async () => mockApiResponse,
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await client.search({ q: "react", location: "Bengaluru" });
    expect(result.source).toBe("live");
    expect(result.total).toBe(42);
    expect(result.rateLimitLimit).toBe(50);
    expect(result.rateLimitRemaining).toBe(47);
    expect(result.jobs).toHaveLength(1);

    const job = result.jobs[0];
    expect(job.id).toBe("jobvetta:jv_001");
    expect(job.title).toBe("Senior React Developer");
    expect(job.normalizedCity).toBe("Bengaluru");
    expect(job.workArrangement).toBe("hybrid");
    expect(job.sourceAttribution).toBe("Jobvetta Live");
    expect(job.isDemo).toBe(false);

    // Verify Authorization header
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("https://api.jobvetta.com/v1/jobs"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${fakeApiKey}`,
        }),
      })
    );
  });

  it("serves subsequent identical searches from cache without calling fetch again", async () => {
    const mockApiResponse = {
      total: 10,
      jobs: [
        {
          job_id: "jv_002",
          title: "Go Backend Developer",
          company: "Tech Mahindra",
          location: "Pune, Maharashtra",
          url: "https://www.jobvetta.com/jobs/jv_002",
        },
      ],
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => null },
      json: async () => mockApiResponse,
    });
    vi.stubGlobal("fetch", fetchMock);

    // First call (hits network)
    const res1 = await client.search({ q: "go", location: "Pune" });
    expect(res1.source).toBe("live");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Second call with same params (hits memory cache)
    const res2 = await client.search({ q: "go", location: "Pune" });
    expect(res2.source).toBe("cache");
    expect(res2.jobs).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1); // No new network call
  });

  it("handles empty results cleanly", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => null },
      json: async () => ({ total: 0, jobs: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await client.search({ q: "xyznonexistent" });
    expect(result.source).toBe("live");
    expect(result.total).toBe(0);
    expect(result.jobs).toHaveLength(0);
  });

  it("handles malformed upstream payload safely", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => null },
      json: async () => ({ unexpected_key: "malformed" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await client.search({ q: "test" });
    expect(result.source).toBe("demo-fallback");
    expect(result.error).toContain("Malformed response format");
  });

  it("handles HTTP 429 rate limiting gracefully", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: {
        get: (header: string) => {
          if (header === "X-RateLimit-Remaining") return "0";
          if (header === "Retry-After") return "3600";
          return null;
        },
      },
      json: async () => ({ error: "Daily request limit of 50 calls reached" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await client.search({ q: "python" });
    expect(result.source).toBe("demo-fallback");
    expect(result.rateLimitRemaining).toBe(0);
    expect(result.error).toContain("Daily request limit");
  });

  it("fetches single job details and normalizes Unix timestamps", async () => {
    const mockDetail = {
      job_id: "jv_detail_100",
      title: "Senior Full Stack Architect",
      company: "Wipro Digital",
      location: "Gurgaon, Haryana, India",
      description: "Full stack engineering in Koramangala and Gurgaon.",
      work_model: "Hybrid",
      employment_type: "Full-time",
      experience_level: "Senior",
      minimum_qualifications: ["B.Tech CS", "5+ years Next.js"],
      skills_required: ["Next.js", "TypeScript", "Node.js"],
      responsibilities: ["Lead engineering sprints"],
      salary_min: 2500000,
      salary_max: 3500000,
      salary_currency: "INR",
      created_at: 1765284099, // Unix seconds
      url: "https://www.jobvetta.com/jobs/jv_detail_100",
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => null },
      json: async () => mockDetail,
    });
    vi.stubGlobal("fetch", fetchMock);

    const job = await client.getJobById("jv_detail_100");
    expect(job).not.toBeNull();
    expect(job?.id).toBe("jobvetta:jv_detail_100");
    expect(job?.normalizedCity).toBe("Gurugram");
    expect(job?.requiredSkills).toEqual(["Next.js", "TypeScript", "Node.js"]);
    expect(job?.postedAt).toBe(new Date(1765284099 * 1000).toISOString());
  });
});
