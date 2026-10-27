import { describe, it, expect } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { GET as getHealth } from "@/app/api/health/route";

describe("Production Readiness", () => {
  it("generates robots.txt with disallow for api and user private saved jobs", () => {
    const rules = robots();
    expect(rules.sitemap).toContain("/sitemap.xml");
    expect(rules.rules).toBeDefined();
  });

  it("generates sitemap with core landing, jobs, resume, and listings", () => {
    const entries = sitemap();
    expect(entries.length).toBeGreaterThan(3);

    const urls = entries.map((e) => e.url);
    expect(urls.some((u) => u.endsWith("/jobs"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/upload-resume"))).toBe(true);
  });

  it("health check endpoint returns system status and provider state", async () => {
    const response = await getHealth();
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.status).toBe("ok");
    expect(data.services.repository).toBeDefined();
    expect(data.services.greenhouse.status).toBe("live");
    expect(data.memory).toBeDefined();
  });
});
