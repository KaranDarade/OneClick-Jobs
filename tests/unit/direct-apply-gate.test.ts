import { describe, it, expect } from "vitest";
import { isDirectApplicationUrl } from "@/server/jobs/normalize";

describe("Direct Application & Anti-Login Wall Gate", () => {
  it("approves official Greenhouse ATS direct application links", () => {
    const url = "https://boards.greenhouse.io/stripe/jobs/482910";
    expect(isDirectApplicationUrl(url, "greenhouse")).toBe(true);
  });

  it("approves official Lever ATS direct application links", () => {
    const url = "https://jobs.lever.co/meesho/8a2e1d0f";
    expect(isDirectApplicationUrl(url, "lever")).toBe(true);
  });

  it("approves official Ashby ATS direct application links", () => {
    const url = "https://jobs.ashbyhq.com/linear/98214";
    expect(isDirectApplicationUrl(url, "ashby")).toBe(true);
  });

  it("approves official RemoteOK free postings", () => {
    const url = "https://remoteok.com/remote-jobs/12345";
    expect(isDirectApplicationUrl(url, "remoteok")).toBe(true);
  });

  it("approves direct employer career pages", () => {
    const url = "https://acme.com/careers/senior-frontend-engineer";
    expect(isDirectApplicationUrl(url)).toBe(true);
  });

  it("rejects unauthorized login walls", () => {
    const url = "https://unauthorized-aggregator.com/login?redirect=/apply/482910";
    expect(isDirectApplicationUrl(url)).toBe(false);
  });

  it("rejects sign-in gates", () => {
    const url = "https://job-spammer.in/signin?next=apply";
    expect(isDirectApplicationUrl(url)).toBe(false);
  });

  it("rejects registration and account creation gates", () => {
    const url = "https://portal.com/register?job=123";
    expect(isDirectApplicationUrl(url)).toBe(false);
  });

  it("rejects empty or invalid URLs", () => {
    expect(isDirectApplicationUrl("")).toBe(false);
    expect(isDirectApplicationUrl(null)).toBe(false);
  });
});
