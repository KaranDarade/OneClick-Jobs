import { describe, it, expect } from "vitest";
import { extractSkillsFromResume } from "@/server/resume/skills";

describe("Resume Skill Extraction", () => {
  it("extracts canonical technical skills with aliases", () => {
    const text = `
      Senior Software Developer
      Proficient in TypeScript, ReactJS, Next.js, and NodeJS.
      Strong experience with Docker, Kubernetes, and AWS (Amazon Web Services).
    `;
    const result = extractSkillsFromResume(text);

    expect(result.detectedSkills).toContain("TypeScript");
    expect(result.detectedSkills).toContain("React");
    expect(result.detectedSkills).toContain("Next.js");
    expect(result.detectedSkills).toContain("Node.js");
    expect(result.detectedSkills).toContain("Docker");
    expect(result.detectedSkills).toContain("Kubernetes");
    expect(result.detectedSkills).toContain("AWS");
  });

  it("strictly avoids false-positive merges between Java and JavaScript", () => {
    const jsOnlyText = `Full stack JavaScript engineer building SPAs in Vue.js and Express.`;
    const jsResult = extractSkillsFromResume(jsOnlyText);
    expect(jsResult.detectedSkills).toContain("JavaScript");
    expect(jsResult.detectedSkills).not.toContain("Java");

    const javaOnlyText = `Backend engineer with 4 years in Core Java, Spring Boot, and Hibernate.`;
    const javaResult = extractSkillsFromResume(javaOnlyText);
    expect(javaResult.detectedSkills).toContain("Java");
    expect(javaResult.detectedSkills).not.toContain("JavaScript");
  });

  it("strictly distinguishes React from React Native", () => {
    const webText = `Frontend developer specializing in React.js and Tailwind CSS.`;
    const webResult = extractSkillsFromResume(webText);
    expect(webResult.detectedSkills).toContain("React");
    expect(webResult.detectedSkills).not.toContain("React Native");

    const mobileText = `Mobile application developer using React Native and Flutter for iOS & Android.`;
    const mobileResult = extractSkillsFromResume(mobileText);
    expect(mobileResult.detectedSkills).toContain("React Native");
    expect(mobileResult.detectedSkills).toContain("Flutter");
  });

  it("strictly distinguishes SQL from PostgreSQL", () => {
    const sqlText = `Database analyst proficient in SQL query optimization and MySQL databases.`;
    const sqlResult = extractSkillsFromResume(sqlText);
    expect(sqlResult.detectedSkills).toContain("SQL");
    expect(sqlResult.detectedSkills).toContain("MySQL");
    expect(sqlResult.detectedSkills).not.toContain("PostgreSQL");

    const postgresText = `Data engineer scaling PostgreSQL and Redis clusters.`;
    const pgResult = extractSkillsFromResume(postgresText);
    expect(pgResult.detectedSkills).toContain("PostgreSQL");
    expect(pgResult.detectedSkills).toContain("Redis");
  });

  it("handles special language tokens like C++, C#, .NET safely", () => {
    const text = `Systems programming in C++ and building enterprise microservices with C# and .NET core.`;
    const result = extractSkillsFromResume(text);
    expect(result.detectedSkills).toContain("C++");
    expect(result.detectedSkills).toContain("C#");
  });

  it("extracts explicit years of experience reliably", () => {
    const text = `
      John Doe
      Summary: 5+ years of experience developing distributed microservices.
      Skills: Golang, Docker, GCP, Kafka.
    `;
    const result = extractSkillsFromResume(text);
    expect(result.experienceYears).toBe(5);
    expect(result.experienceLevelHint).toBe("mid");
  });

  it("handles text with no recognized skills gracefully with warning", () => {
    const nonTechText = `Sales representative with expertise in relationship management and retail negotiation.`;
    const result = extractSkillsFromResume(nonTechText);
    expect(result.detectedSkills).toHaveLength(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
