/**
 * Technical Skills Normalization and Aliasing
 * Maps informal abbreviations and spelling variants to canonical industry labels.
 * Strictly avoids false-positive merges (e.g. Java != JavaScript, React != React Native, SQL != PostgreSQL).
 */

export interface SkillMapping {
  canonical: string;
  aliases: string[];
}

export const TECHNICAL_SKILL_MAPPINGS: SkillMapping[] = [
  // Web Core
  {
    canonical: "JavaScript",
    aliases: ["javascript", "js", "ecmascript", "es6", "vanilla js"],
  },
  {
    canonical: "TypeScript",
    aliases: ["typescript", "ts"],
  },
  {
    canonical: "HTML/CSS",
    aliases: ["html/css", "html", "html5", "css", "css3", "html & css"],
  },

  // Frontend Frameworks
  {
    canonical: "React",
    aliases: ["react", "react.js", "reactjs", "react js"],
  },
  {
    canonical: "Next.js",
    aliases: ["next.js", "nextjs", "next js", "next"],
  },
  {
    canonical: "Vue.js",
    aliases: ["vue.js", "vuejs", "vue", "vue 3"],
  },
  {
    canonical: "Angular",
    aliases: ["angular", "angularjs", "angular 2+"],
  },
  {
    canonical: "Tailwind CSS",
    aliases: ["tailwind css", "tailwind", "tailwindcss"],
  },
  {
    canonical: "Redux",
    aliases: ["redux", "redux toolkit", "rtk"],
  },

  // Mobile
  {
    canonical: "React Native",
    aliases: ["react native", "react-native", "rn"],
  },
  {
    canonical: "Flutter",
    aliases: ["flutter", "dart/flutter"],
  },
  {
    canonical: "Android",
    aliases: ["android", "android sdk", "jetpack compose"],
  },
  {
    canonical: "iOS",
    aliases: ["ios", "swift", "swiftui"],
  },

  // Backend Runtimes & Languages
  {
    canonical: "Node.js",
    aliases: ["node.js", "nodejs", "node js"],
  },
  {
    canonical: "Python",
    aliases: ["python", "python3", "py"],
  },
  {
    canonical: "Java",
    aliases: ["java", "core java", "java 8", "java 11", "java 17", "java 21"],
  },
  {
    canonical: "Golang",
    aliases: ["golang", "go", "go lang"],
  },
  {
    canonical: "Rust",
    aliases: ["rust", "rustlang"],
  },
  {
    canonical: "C++",
    aliases: ["c++", "cpp"],
  },
  {
    canonical: "C#",
    aliases: ["c#", "c-sharp", "csharp", ".net"],
  },
  {
    canonical: "Ruby on Rails",
    aliases: ["ruby on rails", "rails", "ror"],
  },
  {
    canonical: "FastAPI",
    aliases: ["fastapi", "fast api"],
  },
  {
    canonical: "Spring Boot",
    aliases: ["spring boot", "springboot", "spring"],
  },

  // Databases & Stores
  {
    canonical: "PostgreSQL",
    aliases: ["postgresql", "postgres", "psql", "postgres db"],
  },
  {
    canonical: "MySQL",
    aliases: ["mysql", "my sql"],
  },
  {
    canonical: "MongoDB",
    aliases: ["mongodb", "mongo", "mongo db"],
  },
  {
    canonical: "Redis",
    aliases: ["redis", "redis cache"],
  },
  {
    canonical: "SQL",
    aliases: ["sql", "relational database", "rdbms"],
  },
  {
    canonical: "Snowflake",
    aliases: ["snowflake", "snowflake db"],
  },

  // Cloud & DevOps
  {
    canonical: "AWS",
    aliases: ["aws", "amazon web services", "amazon aws"],
  },
  {
    canonical: "Google Cloud Platform",
    aliases: ["gcp", "google cloud", "google cloud platform"],
  },
  {
    canonical: "Azure",
    aliases: ["azure", "microsoft azure"],
  },
  {
    canonical: "Docker",
    aliases: ["docker", "containerization"],
  },
  {
    canonical: "Kubernetes",
    aliases: ["kubernetes", "k8s"],
  },
  {
    canonical: "CI/CD",
    aliases: ["ci/cd", "ci-cd", "continuous integration", "github actions", "gitlab ci"],
  },
  {
    canonical: "Terraform",
    aliases: ["terraform", "iac"],
  },
  {
    canonical: "Linux",
    aliases: ["linux", "unix", "ubuntu"],
  },

  // Testing & Quality
  {
    canonical: "Playwright",
    aliases: ["playwright", "playwright testing"],
  },
  {
    canonical: "Selenium",
    aliases: ["selenium", "selenium webdriver"],
  },
  {
    canonical: "Jest",
    aliases: ["jest", "jest testing"],
  },
  {
    canonical: "Manual Testing",
    aliases: ["manual testing", "qa testing", "exploratory testing"],
  },

  // Data & AI
  {
    canonical: "PyTorch",
    aliases: ["pytorch", "torch"],
  },
  {
    canonical: "TensorFlow",
    aliases: ["tensorflow", "tf"],
  },
  {
    canonical: "Power BI",
    aliases: ["power bi", "powerbi"],
  },
  {
    canonical: "Machine Learning",
    aliases: ["machine learning", "ml", "ai/ml"],
  },
  {
    canonical: "NLP",
    aliases: ["nlp", "natural language processing"],
  },
];

/**
 * Normalizes a single skill string to its canonical representation if recognized.
 * If unrecognized, trims and returns clean original casing.
 */
export function normalizeSkillName(rawSkill: string): string {
  if (!rawSkill || typeof rawSkill !== "string") return "";
  const trimmed = rawSkill.trim();
  if (!trimmed) return "";

  const lower = trimmed.toLowerCase();

  for (const mapping of TECHNICAL_SKILL_MAPPINGS) {
    if (mapping.canonical.toLowerCase() === lower) {
      return mapping.canonical;
    }
    if (mapping.aliases.some((a) => a === lower)) {
      return mapping.canonical;
    }
  }

  return trimmed;
}

/**
 * Normalizes an array of skills, removing duplicates and empty strings.
 */
export function normalizeSkillList(skills: string[]): string[] {
  if (!Array.isArray(skills)) return [];
  const normalized = skills
    .map((s) => normalizeSkillName(s))
    .filter((s) => s.length > 0);

  // Deduplicate case-insensitively while preserving canonical casing
  const seen = new Set<string>();
  const result: string[] = [];

  for (const skill of normalized) {
    const key = skill.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(skill);
    }
  }

  return result;
}
