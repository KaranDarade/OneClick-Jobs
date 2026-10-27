import { TECHNICAL_SKILL_MAPPINGS, normalizeSkillList } from "@/server/jobs/skills";

export interface SkillExtractionResult {
  detectedSkills: string[];
  experienceYears: number | null;
  experienceLevelHint: string | null;
  warnings: string[];
}

/**
 * Escapes regex special characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Creates boundary-safe regex matching for technical skill tokens.
 * Handles tricky tokens like "C++", "C#", ".NET", "Node.js", "Next.js", "Vue.js", "Java", "Go", "R", "SQL".
 */
function matchesSkillToken(text: string, token: string): boolean {
  const lowerText = text.toLowerCase();
  const lowerToken = token.toLowerCase();

  // Edge Case 1: Exact language symbols with special punctuation
  if (lowerToken === "c++" || lowerToken === "cpp") {
    return /\bc\+\+(\b|[\s,;.)/])|\bcpp\b/i.test(text);
  }
  if (lowerToken === "c#" || lowerToken === "csharp") {
    return /\bc#(\b|[\s,;.)/])|\bcsharp\b/i.test(text);
  }
  if (lowerToken === ".net" || lowerToken === "dotnet") {
    return /(\s|\/|^)\.net(\b|[\s,;.)/])|\bdotnet\b/i.test(text);
  }

  // Edge Case 2: Short 1-2 character tokens (e.g. "go", "r", "js", "ts", "ml", "ai")
  if (lowerToken === "go" || lowerToken === "golang") {
    return /\bgolang\b/i.test(text) || /\bgo\s+(developer|engineer|language|backend|programming)\b/i.test(text);
  }
  if (lowerToken === "r") {
    return /\br\s+(developer|engineer|programming|data|package)\b/i.test(text);
  }
  if (lowerToken === "c") {
    return /\bc\s+(programming|language)\b/i.test(text);
  }

  // Edge Case 3: Dot syntax frameworks ("node.js", "next.js", "vue.js", "react.js")
  if (lowerToken.endsWith(".js")) {
    const baseName = lowerToken.replace(".js", "");
    const escaped = escapeRegex(lowerToken);
    const regex = new RegExp(`(\\b${escaped}\\b|\\b${baseName}js\\b|\\b${baseName}\\s+js\\b)`, "i");
    return regex.test(text);
  }

  // Edge Case 4: Critical distinction — Java vs JavaScript
  if (lowerToken === "java") {
    // Must match Java, Core Java, Java 8/11/17/21, but NOT JavaScript or JavaFX or Java-beans
    return /\bjava(\s+(8|11|17|21|ee|se|core|backend|developer|engineer))?\b/i.test(text) &&
      !/\bjavascript\b/i.test(text.substring(Math.max(0, lowerText.indexOf("java") - 5), lowerText.indexOf("java") + 15));
  }

  // Edge Case 5: Critical distinction — React vs React Native
  if (lowerToken === "react") {
    return /\breact(\.js|js)?\b/i.test(text);
  }
  if (lowerToken === "react native") {
    return /\breact[\s-]native\b/i.test(text);
  }

  // Edge Case 6: Critical distinction — SQL vs PostgreSQL
  if (lowerToken === "sql") {
    return /\bsql\b/i.test(text);
  }
  if (lowerToken === "postgresql" || lowerToken === "postgres") {
    return /\bpostgres(ql)?\b/i.test(text);
  }

  // Standard word boundary matching
  const escaped = escapeRegex(lowerToken);
  const regex = new RegExp(`(^|[\\s,;.:/()[\\]{}<>\n\r])${escaped}($|[\\s,;.:/()[\\]{}<>\n\r])`, "i");
  return regex.test(text);
}

/**
 * Extracts technical skills from plain resume text using the canonical Phase 2 taxonomy.
 * Guaranteed deterministic: same text will always return the exact same canonical skills list.
 */
export function extractSkillsFromResume(text: string): SkillExtractionResult {
  const detected = new Set<string>();
  const warnings: string[] = [];

  if (!text || text.trim().length === 0) {
    return {
      detectedSkills: [],
      experienceYears: null,
      experienceLevelHint: null,
      warnings: ["Empty text provided for skill extraction."],
    };
  }

  // 1. Scan across all canonical skill mappings
  for (const mapping of TECHNICAL_SKILL_MAPPINGS) {
    // Check canonical name
    if (matchesSkillToken(text, mapping.canonical)) {
      detected.add(mapping.canonical);
      continue;
    }

    // Check aliases
    for (const alias of mapping.aliases) {
      if (matchesSkillToken(text, alias)) {
        detected.add(mapping.canonical);
        break;
      }
    }
  }

  // 2. Deterministic total experience detection (bounded regex looking for explicit total experience statements)
  let experienceYears: number | null = null;
  let experienceLevelHint: string | null = null;

  // Patterns like: "5+ years of experience", "Total Experience: 4.5 years", "3 yrs experience"
  const expMatch = text.match(
    /(?:total\s+experience|experience\s*(?:summary)?|work\s+experience)?[^\w\n]{0,10}(\d{1,2}(?:\.\d)?)\+?\s*(?:years?|yrs?)(?:\s+of\s+experience)?/i
  );

  if (expMatch && expMatch[1]) {
    const parsedYears = parseFloat(expMatch[1]);
    if (!isNaN(parsedYears) && parsedYears >= 0 && parsedYears <= 40) {
      experienceYears = parsedYears;
    }
  }

  // Level classification hint
  if (experienceYears !== null) {
    if (experienceYears < 1) experienceLevelHint = "fresher";
    else if (experienceYears <= 2) experienceLevelHint = "junior";
    else if (experienceYears <= 5) experienceLevelHint = "mid";
    else if (experienceYears <= 8) experienceLevelHint = "senior";
    else experienceLevelHint = "lead";
  }

  const finalSkills = normalizeSkillList(Array.from(detected)).sort();

  if (finalSkills.length === 0) {
    warnings.push("No known technical skills from our taxonomy were detected in the text.");
  }

  return {
    detectedSkills: finalSkills,
    experienceYears,
    experienceLevelHint,
    warnings,
  };
}
