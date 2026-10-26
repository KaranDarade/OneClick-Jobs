import { describe, it, expect } from "vitest";
import { normalizeSkillName, normalizeSkillList } from "@/server/jobs/skills";

describe("Skill Normalization & Aliasing", () => {
  it("normalizes common JavaScript / TypeScript aliases", () => {
    expect(normalizeSkillName("JS")).toBe("JavaScript");
    expect(normalizeSkillName("javascript")).toBe("JavaScript");
    expect(normalizeSkillName("TS")).toBe("TypeScript");
    expect(normalizeSkillName("typescript")).toBe("TypeScript");
  });

  it("normalizes React, Next.js, and Vue variations", () => {
    expect(normalizeSkillName("ReactJS")).toBe("React");
    expect(normalizeSkillName("react.js")).toBe("React");
    expect(normalizeSkillName("nextjs")).toBe("Next.js");
    expect(normalizeSkillName("Next.js")).toBe("Next.js");
    expect(normalizeSkillName("vue.js")).toBe("Vue.js");
  });

  it("normalizes Node.js, Python, and Golang aliases", () => {
    expect(normalizeSkillName("nodejs")).toBe("Node.js");
    expect(normalizeSkillName("node.js")).toBe("Node.js");
    expect(normalizeSkillName("python3")).toBe("Python");
    expect(normalizeSkillName("go lang")).toBe("Golang");
    expect(normalizeSkillName("golang")).toBe("Golang");
  });

  it("normalizes Database and Cloud aliases", () => {
    expect(normalizeSkillName("postgres")).toBe("PostgreSQL");
    expect(normalizeSkillName("postgresql")).toBe("PostgreSQL");
    expect(normalizeSkillName("amazon web services")).toBe("AWS");
    expect(normalizeSkillName("gcp")).toBe("Google Cloud Platform");
    expect(normalizeSkillName("k8s")).toBe("Kubernetes");
  });

  it("strictly avoids false-positive merges between distinct technologies", () => {
    // Java is NOT JavaScript
    expect(normalizeSkillName("Java")).toBe("Java");
    expect(normalizeSkillName("JavaScript")).toBe("JavaScript");
    expect(normalizeSkillName("Java")).not.toBe("JavaScript");

    // React is NOT React Native
    expect(normalizeSkillName("React")).toBe("React");
    expect(normalizeSkillName("React Native")).toBe("React Native");
    expect(normalizeSkillName("RN")).toBe("React Native");

    // SQL is NOT PostgreSQL
    expect(normalizeSkillName("SQL")).toBe("SQL");
    expect(normalizeSkillName("Postgres")).toBe("PostgreSQL");
  });

  it("deduplicates skill arrays and cleans whitespace", () => {
    const rawList = ["JS", "JavaScript", "ReactJS", "react", "Python", "  "];
    const normalized = normalizeSkillList(rawList);
    expect(normalized).toEqual(["JavaScript", "React", "Python"]);
  });
});
