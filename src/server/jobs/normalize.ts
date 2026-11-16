import { z } from "zod";
import { Job, WorkArrangement, ExperienceLevel, EmploymentType, SalaryPeriod, JobStatus, RoleCategory } from "@/types/job";
import { normalizeIndianLocation } from "./locations";
import { normalizeSkillList } from "./skills";

/**
 * Validates whether a job posting strictly belongs to software engineering.
 * Filters out all non-software departments (Sales, Marketing, HR, Accounting, Medical, etc.)
 */
export function isSoftwareEngineeringJob(title: string, description = "", skills: string[] = []): boolean {
  const combinedText = `${title} ${description.slice(0, 1000)} ${skills.join(" ")}`.toLowerCase();
  const lowerTitle = title.toLowerCase();

  // 1. Explicit exclusions: non-engineering departments and titles
  const nonTechExclusions = [
    "accountant", "payroll", "sales", "business development", "bd lead", "account manager",
    "account executive", "marketing", "recruiter", "recruiting", "talent acquisition",
    "hr", "hrbp", "human resources", "legal counsel", "tele caller", "tele-caller",
    "telehealth", "customer support", "customer success", "patient care", "endocrinologist",
    "security & investigation", "risk operations", "content marketing", "video editor",
    "medical", "nurse", "billing", "commercial accounts", "field marketing", "field sales",
    "brand rep", "revenue cycle", "hil support", "procurement", "auditor", "audit", "fraud",
    "contracts manager", "contract manager", "head of ecosystem", "product manager", "product management",
    "growth manager", "growth management", "user growth", "paytm ads", "campaign management", "employee experience", "partnerships",
    "cst", "tse", "technical support", "helpdesk", "customer service"
  ];

  for (const exc of nonTechExclusions) {
    const excRegex = new RegExp(`(^|[^a-z0-9])${exc}([^a-z0-9]|$)`, "i");
    if (excRegex.test(lowerTitle)) {
      // Allow only if title contains explicit engineering or software keywords
      const hasSoftwareOverride = /\b(software|developer|devops|sre|sdet|data engineer|ai engineer|ml engineer|backend|frontend|fullstack|firmware|embedded)\b/i.test(lowerTitle);
      if (!hasSoftwareOverride) {
        return false;
      }
    }
  }

  // 2. Inclusion criteria: must match at least one software engineering domain
  const softwarePatterns = [
    // Frontend
    /\b(frontend|front-end|ui developer|web developer|react|next\.js|vue|angular|tailwind|javascript|typescript|html|css|mern|mean)\b/i,
    // Backend
    /\b(backend|back-end|api|node|python|java\b|golang|\bgo\b|rust|ruby|\bc\+\+|\bc\b|c#|\.net|microservices|server|database|postgresql|redis|mongodb|sql|spring|django|flask|fastapi)\b/i,
    // Full Stack & General Software Engineering
    /\b(fullstack|full-stack|full stack|mern|mean|software engineer|software developer|programmer|coder|sde\b|swe\b)\b/i,
    // Mobile
    /\b(mobile|android|ios|flutter|react native|swift|kotlin)\b/i,
    // Cloud & DevOps
    /\b(devops|sre|cloud|infrastructure engineer|platform engineer|kubernetes|docker|terraform|aws|gcp|azure|ci\/cd|linux)\b/i,
    // Data & AI / ML
    /\b(data engineer|data scientist|machine learning|ml\b|artificial intelligence|ai engineer|ai developer|deep learning|nlp|computer vision|analytics engineer|big data|spark)\b/i,
    // QA & Testing
    /\b(qa engineer|quality assurance|testing|test engineer|automation engineer|sdet)\b/i,
  ];

  return softwarePatterns.some(pattern => pattern.test(combinedText));
}

/**
 * Infers ALL matching role categories for a job (e.g. Python Developer with Cloud skills gets both Backend and DevOps & Cloud)
 */
export function inferRoleCategories(title: string, skills: string[] = [], description = ""): RoleCategory[] {
  const combinedText = `${title} ${description.slice(0, 1000)} ${skills.join(" ")}`.toLowerCase();
  const categories = new Set<RoleCategory>();

  // Frontend
  if (/\b(frontend|front-end|ui developer|web developer|react|next\.js|vue|angular|tailwind|javascript|typescript|html|css|mern|mean)\b/i.test(combinedText)) {
    categories.add("Frontend");
  }

  // Backend
  if (/\b(backend|back-end|api|node|python|java\b|golang|\bgo\b|rust|ruby|\bc\+\+|\bc\b|c#|\.net|microservices|server|database|postgresql|redis|mongodb|sql|spring|django|flask|fastapi)\b/i.test(combinedText)) {
    categories.add("Backend");
  }

  // Full Stack
  if (
    /\b(fullstack|full-stack|full stack|mern|mean)\b/i.test(combinedText) ||
    (categories.has("Frontend") && categories.has("Backend")) ||
    (/\b(software engineer|developer|sde|swe)\b/i.test(combinedText) && !categories.has("Frontend") && !categories.has("Backend"))
  ) {
    categories.add("Full Stack");
  }

  // Mobile
  if (/\b(mobile|android|ios|flutter|react native|swift|kotlin)\b/i.test(combinedText)) {
    categories.add("Mobile");
  }

  // DevOps & Cloud
  if (/\b(devops|sre|cloud|infrastructure|platform|kubernetes|docker|terraform|aws|gcp|azure|ci\/cd|linux)\b/i.test(combinedText)) {
    categories.add("DevOps & Cloud");
  }

  // Data & AI / ML
  if (/\b(data engineer|data scientist|machine learning|ml\b|artificial intelligence|ai\b|deep learning|nlp|computer vision|analytics|big data|spark|pytorch|tensorflow)\b/i.test(combinedText)) {
    categories.add("Data & AI");
  }

  // QA & Testing
  if (/\b(qa|quality assurance|testing|test|automation engineer|sdet)\b/i.test(combinedText)) {
    categories.add("QA & Testing");
  }

  // Product & Design
  if (/\b(ui\/ux|ux designer|product designer|system design)\b/i.test(combinedText)) {
    categories.add("Product & Design");
  }

  if (categories.size === 0) {
    categories.add("General Tech");
  }

  return Array.from(categories);
}

/**
 * Infers the primary role category from title and skills
 */
export function inferRoleCategory(title: string, skills: string[] = []): RoleCategory {
  const lowerTitle = title.toLowerCase();

  // Match title first for highest accuracy
  if (/\b(data engineer|data scientist|machine learning|ml|ai|deep learning|nlp|computer vision)\b/i.test(lowerTitle)) {
    return "Data & AI";
  }
  if (/\b(devops|sre|cloud|infrastructure|platform|kubernetes)\b/i.test(lowerTitle)) {
    return "DevOps & Cloud";
  }
  if (/\b(qa|quality assurance|testing|test|automation engineer|sdet)\b/i.test(lowerTitle)) {
    return "QA & Testing";
  }
  if (/\b(mobile|android|ios|flutter|react native|swift)\b/i.test(lowerTitle)) {
    return "Mobile";
  }
  if (/\b(frontend|front-end|ui developer|web developer|react|vue|angular)\b/i.test(lowerTitle)) {
    return "Frontend";
  }
  if (/\b(fullstack|full-stack|full stack)\b/i.test(lowerTitle)) {
    return "Full Stack";
  }
  if (/\b(backend|back-end|api|node|python|java|golang|rust|ruby|server|c#|c\+\+|spring|django)\b/i.test(lowerTitle)) {
    return "Backend";
  }

  const all = inferRoleCategories(title, skills);
  return all[0] || "General Tech";
}

/**
 * Raw input schema for validating unstructured or external provider payloads.
 */
export const RawJobInputSchema = z.object({
  id: z.string().optional(),
  providerId: z.string().min(1, "providerId is required"),
  externalId: z.string().min(1, "externalId is required"),
  title: z.string().min(1, "title is required"),
  company: z.string().min(1, "company is required"),
  companyLogoUrl: z.string().nullable().optional(),
  originalUrl: z.string().url("originalUrl must be a valid URL"),
  sourceAttribution: z.string().optional(),
  originalLocation: z.string().nullable().optional(),
  location: z.string().nullable().optional(), // alias often used by providers
  workArrangement: z.string().nullable().optional(),
  remoteEligibility: z.string().nullable().optional(),
  employmentType: z.string().nullable().optional(),
  experienceLevel: z.string().nullable().optional(),
  experienceYearsMin: z.number().nullable().optional(),
  experienceYearsMax: z.number().nullable().optional(),
  requiredSkills: z.array(z.string()).optional(),
  preferredSkills: z.array(z.string()).optional(),
  requiredQualifications: z.array(z.string()).optional(),
  preferredQualifications: z.array(z.string()).optional(),
  description: z.string().optional(),
  responsibilities: z.array(z.string()).optional(),
  salaryMin: z.number().nullable().optional(),
  salaryMax: z.number().nullable().optional(),
  salaryCurrency: z.string().nullable().optional(),
  salaryPeriod: z.string().nullable().optional(),
  postedAt: z.string().nullable().optional(),
  firstSeenAt: z.string().nullable().optional(),
  lastSeenAt: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  providerMeta: z.record(z.string(), z.unknown()).optional(),
  isDemo: z.boolean().optional(),
});

export type RawJobInput = z.infer<typeof RawJobInputSchema>;

export interface NormalizationResult {
  success: boolean;
  job?: Job;
  errors?: string[];
}

/**
 * Normalizes work arrangement strings into canonical categories.
 */
export function normalizeWorkArrangement(raw?: string | null): WorkArrangement {
  if (!raw || typeof raw !== "string") return "unknown";
  const lower = raw.trim().toLowerCase();

  if (
    lower.includes("remote") ||
    lower.includes("wfh") ||
    lower.includes("work from home") ||
    lower.includes("telecommute")
  ) {
    return "remote";
  }

  if (
    lower.includes("hybrid") ||
    lower.includes("flexible") ||
    lower.includes("partially remote")
  ) {
    return "hybrid";
  }

  if (
    lower.includes("on-site") ||
    lower.includes("onsite") ||
    lower.includes("office") ||
    lower.includes("work from office") ||
    lower.includes("in-person") ||
    lower.includes("in person")
  ) {
    return "on-site";
  }

  return "unknown";
}

/**
 * Normalizes experience level strings, title keywords, and numerical hints.
 */
export function normalizeExperienceLevel(
  rawLevel?: string | null,
  minYears?: number | null,
  maxYears?: number | null,
  title?: string | null,
  description?: string | null
): ExperienceLevel {
  const combinedText = `${rawLevel || ""} ${title || ""} ${description ? description.slice(0, 1000) : ""}`.toLowerCase();

  // 1. Highest specificity: Internship
  if (
    /\b(intern|internship|co-op|coop|apprentice|apprenticeship|summer intern|winter intern)\b/i.test(combinedText)
  ) {
    return "internship";
  }

  // 2. Lead / Principal / Director / Staff / Architect / Head / VP / Engineering Manager
  if (
    /\b(principal|architect|director|vp|vice president|head of|cluster head|staff engineer|staff software|engineering manager|tech lead|team lead|technical lead)\b/i.test(combinedText)
  ) {
    return "lead";
  }

  // 3. Senior Level (Check before fresher/junior to avoid "Sr. Software Engineer I" misclassification)
  if (
    /\b(senior|sr|iii|iv|level 3|level 4|senior engineer|senior developer|sr software|account executive enterprise|senior manager|sr manager)\b/i.test(combinedText) ||
    /\bsr\./i.test(combinedText)
  ) {
    return "senior";
  }

  // Guard against senior/lead indicators being mistakenly classified as fresher/junior
  const hasSeniorLeadIndicator = /\b(senior|sr|lead|principal|staff|director|head|vp)\b|\bsr\./i.test(combinedText);

  // 4. Fresher / Entry Level / Graduate / SDE 1 / L1 / Associate Software Engineer
  if (
    !hasSeniorLeadIndicator && (
      /\b(fresher|entry level|entry-level|entry|trainee|graduate|campus|new grad|college graduate|junior associate|associate software|associate developer|associate engineer|graduate engineer|graduate software|sde\s*1|sde\s*i\b|sde-1|sde-i|software engineer 1|software engineer i\b|engineer 1|engineer i\b|developer 1|developer i\b|junior developer|junior engineer|junior software|l1\b|l-1\b|ic1\b|ic-1\b|level 1\b|band 1\b)\b/i.test(combinedText) ||
      /\((?:l1|l-1|ic1|ic-1|level\s*1)\)/i.test(combinedText) ||
      /\b0\s*-\s*1\s*(?:year|yr)|0\s*-\s*2\s*(?:years|yrs)\b/i.test(combinedText) ||
      /freshers?\s+(can|are\s+welcome\s+to)\s+apply/i.test(combinedText)
    )
  ) {
    return "fresher";
  }

  // 5. Junior / Associate Level
  if (
    !hasSeniorLeadIndicator &&
    /\b(junior|jr|associate|coordinator|sourcer|assistant|tele caller|customer support|support specialist)\b/i.test(combinedText)
  ) {
    return "junior";
  }

  // 6. Mid Level (General Managers, Product Managers, Engineers, Developers, Specialists)
  if (
    /\b(mid|intermediate|level 2|ii|2|sde 2|sde ii|engineer ii|developer ii|software engineer|developer|engineer|analyst|designer|accountant|counsel|executive|specialist|expert|manager|lead|management)\b/i.test(combinedText)
  ) {
    return "mid";
  }

  // 7. Infer from explicit year ranges if provided
  if (typeof minYears === "number") {
    if (minYears === 0 && (maxYears === 0 || maxYears === 1)) return "fresher";
    if (minYears >= 8) return "lead";
    if (minYears >= 5) return "senior";
    if (minYears >= 3) return "mid";
    if (minYears >= 1) return "junior";
  }

  // 8. If title contains standard tech roles without senior/lead prefixes, default sensibly to "mid"
  if (
    /\b(software engineer|developer|programmer|analyst|designer|consultant|qa engineer)\b/i.test(combinedText)
  ) {
    return "mid";
  }

  return "unknown";
}

/**
 * Normalizes employment type.
 */
export function normalizeEmploymentType(raw?: string | null): EmploymentType {
  if (!raw || typeof raw !== "string") return "unknown";
  const lower = raw.trim().toLowerCase();

  if (lower.includes("full-time") || lower.includes("full time") || lower.includes("permanent")) return "full-time";
  if (lower.includes("part-time") || lower.includes("part time")) return "part-time";
  if (lower.includes("contract") || lower.includes("consultant")) return "contract";
  if (lower.includes("intern")) return "internship";
  if (lower.includes("freelance")) return "freelance";

  return "unknown";
}

/**
 * Safely parses and validates ISO date strings. Returns null if invalid.
 */
export function validateIsoDate(rawDate?: string | null): string | null {
  if (!rawDate || typeof rawDate !== "string") return null;
  const trimmed = rawDate.trim();
  const parsed = Date.parse(trimmed);
  if (isNaN(parsed)) return null;
  return new Date(parsed).toISOString();
}

/**
 * Validates and transforms a raw job record into canonical Job structure.
 */
export function normalizeJob(rawInput: unknown): NormalizationResult {
  const parseResult = RawJobInputSchema.safeParse(rawInput);
  if (!parseResult.success) {
    const errorMessages = parseResult.error.issues.map(
      (issue) => `${issue.path.join(".")}: ${issue.message}`
    );
    return {
      success: false,
      errors: errorMessages,
    };
  }

  const raw = parseResult.data;
  const now = new Date().toISOString();

  // Location normalization
  const rawLocString = raw.originalLocation || raw.location || null;
  const locInfo = normalizeIndianLocation(rawLocString);

  // Work arrangement
  const workArrangement = normalizeWorkArrangement(raw.workArrangement);

  // Experience level
  const experienceLevel = normalizeExperienceLevel(
    raw.experienceLevel,
    raw.experienceYearsMin,
    raw.experienceYearsMax,
    raw.title,
    raw.description
  );

  // Employment type
  const employmentType = normalizeEmploymentType(raw.employmentType);

  // Skills
  const requiredSkills = normalizeSkillList(raw.requiredSkills || []);
  const preferredSkills = normalizeSkillList(raw.preferredSkills || []);

  // Dates
  const validPostedAt = validateIsoDate(raw.postedAt);
  const validFirstSeenAt = validateIsoDate(raw.firstSeenAt) || now;
  const validLastSeenAt = validateIsoDate(raw.lastSeenAt) || now;

  // Salary validation (prevent negative or absurd numbers)
  let salaryMin = raw.salaryMin ?? null;
  let salaryMax = raw.salaryMax ?? null;
  if (typeof salaryMin === "number" && salaryMin < 0) salaryMin = null;
  if (typeof salaryMax === "number" && salaryMax < 0) salaryMax = null;
  if (salaryMin !== null && salaryMax !== null && salaryMin > salaryMax) {
    // swap if reversed
    const temp = salaryMin;
    salaryMin = salaryMax;
    salaryMax = temp;
  }

  const normalizedJob: Job = {
    id: raw.id || `${raw.providerId}:${raw.externalId}`,
    providerId: raw.providerId.trim(),
    externalId: raw.externalId.trim(),
    title: raw.title.trim(),
    company: raw.company.trim(),
    companyLogoUrl: raw.companyLogoUrl || null,
    originalUrl: raw.originalUrl.trim(),
    sourceAttribution: raw.sourceAttribution ? raw.sourceAttribution.trim() : raw.providerId.trim(),
    originalLocation: locInfo.original,
    normalizedCity: locInfo.normalizedCity,
    normalizedState: locInfo.normalizedState,
    country: "India",
    workArrangement,
    remoteEligibility: raw.remoteEligibility ? raw.remoteEligibility.trim() : locInfo.isIndiaRemote ? "India Remote" : null,
    employmentType,
    experienceRange:
      raw.experienceYearsMin !== undefined || raw.experienceYearsMax !== undefined
        ? {
            minYears: raw.experienceYearsMin ?? null,
            maxYears: raw.experienceYearsMax ?? null,
          }
        : null,
    experienceLevel,
    requiredSkills,
    preferredSkills,
    requiredQualifications: (raw.requiredQualifications || []).map((q) => q.trim()).filter(Boolean),
    preferredQualifications: (raw.preferredQualifications || []).map((q) => q.trim()).filter(Boolean),
    description: (raw.description || "").trim(),
    responsibilities: (raw.responsibilities || []).map((r) => r.trim()).filter(Boolean),
    salaryMin,
    salaryMax,
    salaryCurrency: raw.salaryCurrency ? raw.salaryCurrency.trim().toUpperCase() : "INR",
    salaryPeriod: (raw.salaryPeriod as SalaryPeriod) || "yearly",
    postedAt: validPostedAt,
    firstSeenAt: validFirstSeenAt,
    lastSeenAt: validLastSeenAt,
    lastRefreshedAt: now,
    status: (raw.status as JobStatus) || "active",
    providerMeta: raw.providerMeta || {},
    isDemo: raw.isDemo ?? false,
    roleCategory: inferRoleCategory(raw.title, requiredSkills),
    roleCategories: inferRoleCategories(raw.title, requiredSkills, raw.description),
  };

  return {
    success: true,
    job: normalizedJob,
  };
}
