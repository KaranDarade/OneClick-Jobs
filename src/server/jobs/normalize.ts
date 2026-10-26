import { z } from "zod";
import { Job, WorkArrangement, ExperienceLevel, EmploymentType, SalaryPeriod, JobStatus } from "@/types/job";
import { normalizeIndianLocation } from "./locations";
import { normalizeSkillList } from "./skills";

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
 * Normalizes experience level strings and numerical hints.
 */
export function normalizeExperienceLevel(
  rawLevel?: string | null,
  minYears?: number | null,
  maxYears?: number | null
): ExperienceLevel {
  const lower = (rawLevel || "").trim().toLowerCase();

  if (lower.includes("intern")) return "internship";
  if (lower.includes("fresher") || lower.includes("entry") || lower.includes("trainee") || lower.includes("graduate")) {
    return "fresher";
  }
  if (lower.includes("junior") || lower.includes("associate")) return "junior";
  if (lower.includes("lead") || lower.includes("principal") || lower.includes("architect") || lower.includes("director") || lower.includes("staff")) {
    return "lead";
  }
  if (lower.includes("senior") || lower.includes("sr.")) return "senior";
  if (lower.includes("mid")) return "mid";

  // Infer from year ranges if provided
  if (typeof minYears === "number") {
    if (minYears === 0 && (maxYears === 0 || maxYears === 1)) return "fresher";
    if (minYears >= 8) return "lead";
    if (minYears >= 5) return "senior";
    if (minYears >= 3) return "mid";
    if (minYears >= 1) return "junior";
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
    raw.experienceYearsMax
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
  };

  return {
    success: true,
    job: normalizedJob,
  };
}
