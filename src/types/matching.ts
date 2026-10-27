import { WorkArrangement } from "@/types/job";

export interface CandidateProfile {
  id: string;
  extractedSkills: string[];
  userSkills: string[]; // Allows user additions/removals
  experienceYears: number | null;
  experienceLevelHint: string | null;
  preferredArrangements: WorkArrangement[];
  parsedAt: string;
  parsingWarnings: string[];
  fileName?: string;
  fileSizeBytes?: number;
}

export type ScoringComponentStatus = "available" | "unavailable" | "insufficient_data";

export interface ComponentScoreBreakdown {
  score: number;
  maxWeight: number;
  effectiveWeight: number;
  status: ScoringComponentStatus;
  explanation: string;
  details?: Record<string, unknown>;
}

export interface CompatibilityScoreResult {
  algorithmVersion: "1.0.0-rule-based";
  overallScore: number | null; // 0-100, or null if insufficient_data
  status: "scored" | "insufficient_data";
  summaryText: string;
  matchingRequiredSkills: string[];
  missingRequiredSkills: string[];
  matchingPreferredSkills: string[];
  components: {
    requiredSkills: ComponentScoreBreakdown;
    preferredSkills: ComponentScoreBreakdown;
    experience: ComponentScoreBreakdown;
    workArrangement: ComponentScoreBreakdown;
  };
  warnings: string[];
}
