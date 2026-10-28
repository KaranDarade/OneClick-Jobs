import { describe, it, expect, vi, beforeEach } from "vitest";
import { LeverClient, LeverPostingSchema } from "@/server/providers/lever/client";
import { AshbyClient, AshbyJobItemSchema } from "@/server/providers/ashby/client";
import { AdzunaClient, AdzunaSearchResponseSchema } from "@/server/providers/adzuna/client";
import { JoobleClient, JoobleSearchResponseSchema } from "@/server/providers/jooble/client";
import { ApifyClient, ApifyDatasetItemSchema } from "@/server/providers/apify/client";

describe("Multi-Provider Job Feeds", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Lever ATS Client", () => {
    it("validates Lever posting schema correctly", () => {
      const sample = {
        id: "abc-123",
        text: "Senior Software Engineer - Backend",
        createdAt: 1729000000000,
        description: "<p>Lead our engineering team in India</p>",
        descriptionPlain: "Lead our engineering team in India",
        hostedUrl: "https://jobs.lever.co/paytm/abc-123",
        workplaceType: "onsite",
        categories: {
          location: "Noida, India",
          team: "Core Engineering",
          commitment: "Full time",
        },
      };

      const result = LeverPostingSchema.safeParse(sample);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.text).toBe("Senior Software Engineer - Backend");
      }
    });

    it("fetches and normalizes Lever postings with India filter", async () => {
      const mockPostings = [
        {
          id: "job-001",
          text: "Frontend Developer",
          hostedUrl: "https://jobs.lever.co/paytm/job-001",
          categories: { location: "Noida, India" },
          workplaceType: "onsite",
        },
        {
          id: "job-002",
          text: "US Only Role",
          hostedUrl: "https://jobs.lever.co/paytm/job-002",
          categories: { location: "New York, USA" },
          workplaceType: "onsite",
        },
      ];

      vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => mockPostings,
      } as Response);

      const client = new LeverClient();
      const jobs = await client.fetchCompanyJobs("paytm", "Paytm");

      expect(jobs.length).toBe(1);
      expect(jobs[0].title).toBe("Frontend Developer");
      expect(jobs[0].company).toBe("Paytm");
      expect(jobs[0].providerId).toBe("lever");
    });
  });

  describe("Ashby ATS Client", () => {
    it("validates Ashby posting schema correctly", () => {
      const sample = {
        id: "ashby-001",
        title: "Staff Systems Engineer",
        location: "Remote (Global)",
        isRemote: true,
        publishedAt: "2026-10-28T10:00:00Z",
        jobUrl: "https://jobs.ashbyhq.com/supabase/ashby-001",
        descriptionPlain: "Build scalable cloud database architecture",
      };

      const result = AshbyJobItemSchema.safeParse(sample);
      expect(result.success).toBe(true);
    });

    it("fetches and normalizes Ashby jobs", async () => {
      const mockBoard = {
        jobs: [
          {
            id: "ash-1",
            title: "Site Reliability Engineer",
            location: "Remote, Global",
            isRemote: true,
            jobUrl: "https://jobs.ashbyhq.com/supabase/ash-1",
          },
          {
            id: "ash-2",
            title: "Office Manager",
            location: "London, UK",
            isRemote: false,
            jobUrl: "https://jobs.ashbyhq.com/supabase/ash-2",
          },
        ],
      };

      vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => mockBoard,
      } as Response);

      const client = new AshbyClient();
      const jobs = await client.fetchCompanyJobs("supabase", "Supabase");

      expect(jobs.length).toBe(1);
      expect(jobs[0].title).toBe("Site Reliability Engineer");
      expect(jobs[0].providerId).toBe("ashby");
    });
  });

  describe("Adzuna Client", () => {
    it("falls back gracefully when credentials are not configured", async () => {
      const client = new AdzunaClient("", "");
      expect(client.isConfigured()).toBe(false);

      const result = await client.search({ q: "engineer" });
      expect(result.source).toBe("demo-fallback");
      expect(result.jobs.length).toBe(0);
    });

    it("parses live Adzuna results when configured", async () => {
      const mockResponse = {
        count: 1,
        results: [
          {
            id: "adz-12345",
            title: "React Engineer",
            description: "Build scalable frontends",
            redirect_url: "https://adzuna.com/job/12345",
            salary_min: 1500000,
            salary_max: 2500000,
            company: { display_name: "Tech Corp" },
            location: { display_name: "Bengaluru, Karnataka" },
          },
        ],
      };

      const parseResult = AdzunaSearchResponseSchema.safeParse(mockResponse);
      expect(parseResult.success).toBe(true);

      vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const client = new AdzunaClient("test-app", "test-key");
      const result = await client.search({ q: "React" });

      expect(result.source).toBe("live");
      expect(result.jobs.length).toBe(1);
      expect(result.jobs[0].title).toBe("React Engineer");
      expect(result.jobs[0].providerId).toBe("adzuna");
    });
  });

  describe("Jooble Client", () => {
    it("falls back gracefully when API key is missing", async () => {
      const client = new JoobleClient("");
      expect(client.isConfigured()).toBe(false);

      const result = await client.search({ q: "engineer" });
      expect(result.source).toBe("demo-fallback");
    });

    it("parses live Jooble search payload", async () => {
      const mockResponse = {
        totalCount: 1,
        jobs: [
          {
            id: "j-999",
            title: "Node.js Backend Developer",
            location: "Pune, Maharashtra",
            snippet: "Develop APIs using Express and Node",
            link: "https://jooble.org/desc/999",
            company: "Fintech Solutions",
            type: "Full-time",
          },
        ],
      };

      const parsed = JoobleSearchResponseSchema.safeParse(mockResponse);
      expect(parsed.success).toBe(true);

      vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const client = new JoobleClient("test-key");
      const result = await client.search({ q: "Node.js" });

      expect(result.source).toBe("live");
      expect(result.jobs.length).toBe(1);
      expect(result.jobs[0].title).toBe("Node.js Backend Developer");
      expect(result.jobs[0].providerId).toBe("jooble");
    });
  });

  describe("Apify Client", () => {
    it("falls back gracefully when token is missing", async () => {
      const client = new ApifyClient("", "");
      expect(client.isConfigured()).toBe(false);

      const result = await client.search();
      expect(result.source).toBe("demo-fallback");
    });

    it("parses Apify dataset items correctly", async () => {
      const mockDataset = [
        {
          id: "apify-1",
          title: "Full Stack Developer",
          company: "Cloud Innovators",
          location: "Hyderabad, Telangana",
          url: "https://example.com/apify/1",
          description: "Full stack engineering in Hyderabad",
        },
      ];

      vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => mockDataset,
      } as Response);

      const client = new ApifyClient("test-token", "test-dataset");
      const result = await client.search();

      expect(result.source).toBe("live");
      expect(result.jobs.length).toBe(1);
      expect(result.jobs[0].title).toBe("Full Stack Developer");
      expect(result.jobs[0].providerId).toBe("apify");
    });
  });
});
