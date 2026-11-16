import { TECHNICAL_SKILL_MAPPINGS, normalizeSkillList } from "@/server/jobs/skills";
import { RoleCategory } from "@/types/job";
import { CandidateProject } from "@/types/matching";

export interface SkillExtractionResult {
  detectedSkills: string[];
  experienceYears: number | null;
  experienceLevelHint: string | null;
  detectedRoleCategory: RoleCategory;
  secondaryRoleCategories: RoleCategory[];
  projects: CandidateProject[];
  educationHint: string | null;
  warnings: string[];
}

/**
 * Extracts candidate academic and industry projects from resume text
 */
export function extractProjectsFromResume(text: string, detectedSkills: string[]): CandidateProject[] {
  const projects: CandidateProject[] = [];
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  // Identify Projects Section boundary
  let inProjectsSection = false;
  let currentProject: CandidateProject | null = null;

  const sectionHeaderRegex = /^(?:key\s+)?(?:academic\s+|personal\s+|technical\s+)?projects?(?:\s*&?\s*initiatives)?(?:\s*:|$)/i;
  const nextSectionHeaderRegex = /^(?:work\s+experience|employment|experience|education|skills|certifications|achievements|publications|interests|languages)(?:\s*:|$)/i;

  for (const line of lines) {
    if (sectionHeaderRegex.test(line)) {
      inProjectsSection = true;
      continue;
    }

    if (inProjectsSection && nextSectionHeaderRegex.test(line)) {
      inProjectsSection = false;
      if (currentProject) {
        projects.push(currentProject);
        currentProject = null;
      }
      break;
    }

    if (inProjectsSection) {
      // Check if line looks like a project title (e.g. bold or bullet point or title with colon/parenthesis)
      const projectTitleMatch = line.match(/^[-•*#]?\s*([A-Za-z0-9\s-_]{3,45})(?:\s*[-–|:]|\s*\(([^)]+)\)|$)/);
      
      if (projectTitleMatch && projectTitleMatch[1] && !line.toLowerCase().startsWith("used") && !line.toLowerCase().startsWith("built") && !line.toLowerCase().startsWith("developed")) {
        if (currentProject) {
          projects.push(currentProject);
        }

        const rawTitle = projectTitleMatch[1].trim();
        const techHint = projectTitleMatch[2] || "";
        
        // Find matching skills in the line
        const matchedTech = detectedSkills.filter(s => 
          line.toLowerCase().includes(s.toLowerCase()) || techHint.toLowerCase().includes(s.toLowerCase())
        );

        currentProject = {
          title: rawTitle,
          description: line,
          technologies: matchedTech,
        };
      } else if (currentProject) {
        // Append description line
        currentProject.description = `${currentProject.description} ${line}`.slice(0, 300);
        
        // Check for technologies mentioned in description line
        for (const skill of detectedSkills) {
          if (!currentProject.technologies.includes(skill) && line.toLowerCase().includes(skill.toLowerCase())) {
            currentProject.technologies.push(skill);
          }
        }
      }
    }
  }

  if (currentProject) {
    projects.push(currentProject);
  }

  return projects.slice(0, 5); // Return top 5 detected projects
}

/**
 * Extracts education details from resume text
 */
export function extractEducationFromResume(text: string): string | null {
  const eduMatch = text.match(/\b(b\.?tech|b\.?e|m\.?tech|m\.?s|bca|mca|b\.?sc|m\.?sc|phd|bachelor(?:'s)?|master(?:'s)?)(?:\s+(?:in|of)\s+([A-Za-z\s&]{3,35}))?/i);
  if (eduMatch) {
    const degree = eduMatch[1].toUpperCase();
    const branch = eduMatch[2] ? `in ${eduMatch[2].trim()}` : "";
    return `${degree} ${branch}`.trim();
  }
  return null;
}

/**
 * Domain clusters used for deterministic role categorization
 */
const DOMAIN_SKILL_CLUSTERS: Record<RoleCategory, string[]> = {
  Frontend: [
    "React", "Next.js", "Vue.js", "Angular", "HTML/CSS", "Tailwind CSS",
    "JavaScript", "TypeScript", "Redux", "Svelte", "Webpack", "Vite"
  ],
  Backend: [
    "Node.js", "Python", "Java", "Golang", "Rust", "C#", "C++", "Ruby",
    "PostgreSQL", "MongoDB", "Redis", "MySQL", "Express", "NestJS", "FastAPI",
    "Django", "Spring Boot", "GraphQL", "REST", "Microservices", "Kafka", "RabbitMQ"
  ],
  "Full Stack": [
    // Evaluated dynamically if candidate has strong Frontend AND Backend skills
  ],
  Mobile: [
    "React Native", "Flutter", "Android", "iOS", "Swift", "Kotlin"
  ],
  "DevOps & Cloud": [
    "AWS", "Docker", "Kubernetes", "GCP", "Azure", "Terraform", "CI/CD",
    "Linux", "Ansible", "Prometheus", "Grafana", "Helm"
  ],
  "Data & AI": [
    "Python", "SQL", "Machine Learning", "Deep Learning", "PyTorch",
    "TensorFlow", "Pandas", "NumPy", "Data Science", "Computer Vision",
    "NLP", "Big Data", "Spark", "Hadoop"
  ],
  "QA & Testing": [
    "Selenium", "Cypress", "Jest", "Playwright", "Automation Testing", "JUnit", "QA"
  ],
  "Product & Design": [
    "Figma", "UI/UX", "Product Management", "System Design", "Agile", "Scrum"
  ],
  "General Tech": []
};

/**
 * Classifies candidate skills into primary and secondary role categories
 */
export function classifyRoleCategory(skills: string[], text = ""): {
  primary: RoleCategory;
  secondary: RoleCategory[];
} {
  const lowerText = text.toLowerCase();
  const skillSet = new Set(skills.map(s => s.toLowerCase()));

  // Count matches in each domain
  const scores: Partial<Record<RoleCategory, number>> = {};

  for (const [cat, cluster] of Object.entries(DOMAIN_SKILL_CLUSTERS) as [RoleCategory, string[]][]) {
    if (cat === "Full Stack" || cat === "General Tech") continue;
    let count = 0;
    for (const skill of cluster) {
      if (skillSet.has(skill.toLowerCase())) {
        count += 2; // Skill match is high signal
      }
    }
    // Also check text keyword mentions
    if (lowerText.includes(cat.toLowerCase())) {
      count += 3;
    }
    scores[cat] = count;
  }

  // Explicit title indicators in resume text
  if (/\b(frontend|front-end|ui developer|web developer)\b/i.test(lowerText)) {
    scores.Frontend = (scores.Frontend || 0) + 5;
  }
  if (/\b(backend|back-end|api developer|server engineer)\b/i.test(lowerText)) {
    scores.Backend = (scores.Backend || 0) + 5;
  }
  if (/\b(fullstack|full-stack|full stack)\b/i.test(lowerText)) {
    scores["Full Stack"] = (scores["Full Stack"] || 0) + 7;
  }
  if (/\b(android|ios|mobile developer|flutter developer)\b/i.test(lowerText)) {
    scores.Mobile = (scores.Mobile || 0) + 6;
  }
  if (/\b(devops|sre|cloud engineer|platform engineer|infrastructure)\b/i.test(lowerText)) {
    scores["DevOps & Cloud"] = (scores["DevOps & Cloud"] || 0) + 6;
  }
  if (/\b(data scientist|data engineer|machine learning|ml engineer|ai engineer)\b/i.test(lowerText)) {
    scores["Data & AI"] = (scores["Data & AI"] || 0) + 6;
  }
  if (/\b(qa engineer|quality assurance|software tester|automation engineer)\b/i.test(lowerText)) {
    scores["QA & Testing"] = (scores["QA & Testing"] || 0) + 6;
  }

  // If candidate has significant frontend AND backend skills, classify as Full Stack
  const frontendScore = scores.Frontend || 0;
  const backendScore = scores.Backend || 0;
  if ((frontendScore >= 4 && backendScore >= 4) || (scores["Full Stack"] || 0) > 0) {
    scores["Full Stack"] = Math.max(scores["Full Stack"] || 0, frontendScore + backendScore);
  }

  // Sort domains by highest score
  const sortedCategories = (Object.entries(scores) as [RoleCategory, number][])
    .filter(([_, score]) => score > 0)
    .sort((a, b) => b[1] - a[1]);

  if (sortedCategories.length === 0) {
    return { primary: "General Tech", secondary: [] };
  }

  const primary = sortedCategories[0][0];
  const secondary = sortedCategories.slice(1, 3).map(([cat]) => cat);

  return { primary, secondary };
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
      detectedRoleCategory: "General Tech",
      secondaryRoleCategories: [],
      projects: [],
      educationHint: null,
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

  // 2b. Fresher / Entry-Level Heuristics: if explicit multi-year statement is absent,
  // check for student, fresh graduate, intern, entry-level, or recent graduation year indicators
  const hasFresherIndicator = /\b(fresher|entry-level|entry level|graduate trainee|college graduate|recent graduate|fresh graduate|student|intern|internship|campus recruitment|seeking entry-level|seeking an entry level|seeking my first role)\b/i.test(text);
  const isRecentGrad = /(?:b\.?tech|b\.?e|bca|mca|b\.?sc|m\.?sc|graduation|passing year)[^\n\r]{0,40}(?:202[2-7])/i.test(text);

  if (experienceYears === null) {
    if (hasFresherIndicator || isRecentGrad) {
      experienceYears = 0;
      experienceLevelHint = "fresher";
    }
  }

  // Level classification hint from detected years
  if (experienceYears !== null && experienceLevelHint === null) {
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

  // 3. Classify primary and secondary role categories
  const { primary: detectedRoleCategory, secondary: secondaryRoleCategories } = classifyRoleCategory(finalSkills, text);

  // 4. Extract projects and education
  const projects = extractProjectsFromResume(text, finalSkills);
  const educationHint = extractEducationFromResume(text);

  return {
    detectedSkills: finalSkills,
    experienceYears,
    experienceLevelHint,
    detectedRoleCategory,
    secondaryRoleCategories,
    projects,
    educationHint,
    warnings,
  };
}
