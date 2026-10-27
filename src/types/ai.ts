export interface AIMatchAnalysis {
  fitSummary: string;
  strengths: string[];
  growthAreas: string[];
  interviewTips: string[];
  coverLetterStarter: string;
  isAiGenerated: boolean;
  model: string;
}

export interface CandidateContext {
  skills: string[];
  experienceYears?: number;
  preferredArrangement?: string;
}
