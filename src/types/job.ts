// Canonical Job types and schemas for OneClick Jobs

export interface Job {
  id: string;                          // composite ID: provider:externalId
  providerId: string;                  // e.g. "demo-india-curated"
  externalId: string;                  // e.g. "job-001"
  title: string;
  company: string;
  companyLogoUrl: string | null;
  originalUrl: string;
  sourceAttribution: string;
  originalLocation: string | null;
  normalizedCity: string | null;
  normalizedState: string | null;
  country: string;
  workArrangement: WorkArrangement;
  remoteEligibility: string | null;
  employmentType: EmploymentType;
  experienceRange: ExperienceRange | null;
  experienceLevel: ExperienceLevel;
  requiredSkills: string[];
  preferredSkills: string[];
  requiredQualifications: string[];
  preferredQualifications: string[];
  description: string;
  responsibilities: string[];
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryPeriod: SalaryPeriod | null;
  postedAt: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  lastRefreshedAt: string;
  status: JobStatus;
  providerMeta: Record<string, unknown>;
  isDemo?: boolean;
}

export type WorkArrangement = 'on-site' | 'hybrid' | 'remote' | 'unknown';

export type EmploymentType =
  | 'full-time'
  | 'part-time'
  | 'contract'
  | 'internship'
  | 'freelance'
  | 'unknown';

export type ExperienceLevel =
  | 'internship'
  | 'fresher'
  | 'junior'
  | 'mid'
  | 'senior'
  | 'lead'
  | 'unknown';

export interface ExperienceRange {
  minYears: number | null;
  maxYears: number | null;
}

export type SalaryPeriod = 'yearly' | 'monthly' | 'hourly';

export type JobStatus = 'active' | 'expired' | 'unknown';

export interface SearchFilters {
  query: string;
  location: string; // "all" or specific city
  workArrangements: WorkArrangement[];
  experienceLevels: ExperienceLevel[];
  employmentTypes: EmploymentType[];
  postingAge: PostingAge | null;
  sortBy: SortOption;
}

export type PostingAge = '1' | '3' | '7' | '15' | '30';

export type SortOption = 'relevance' | 'newest' | 'match-score' | 'salary-high';

export interface SearchResult {
  jobs: Job[];
  totalCount: number;
  filters: SearchFilters;
}

export interface SavedJob {
  jobId: string;
  savedAt: string;
}
