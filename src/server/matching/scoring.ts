import { Job, WorkArrangement } from "@/types/job";
import { CandidateProfile, CompatibilityScoreResult, ComponentScoreBreakdown } from "@/types/matching";
import { normalizeSkillName } from "@/server/jobs/skills";

const ALGORITHM_VERSION = "1.0.0-rule-based" as const;

/**
 * Base weights defined in master project specification:
 * - Required skills: 50%
 * - Preferred skills: 20%
 * - Experience alignment: 20%
 * - Work arrangement: 10%
 * Total = 100%
 */
const BASE_WEIGHTS = {
  requiredSkills: 50,
  preferredSkills: 20,
  experience: 20,
  workArrangement: 10,
};

/**
 * Deterministically computes the compatibility score (0-100) between a candidate profile and a canonical job listing.
 * Follows strict proportional weight redistribution when components are unavailable or job requirements are unspecified.
 */
export function calculateJobCompatibility(
  candidate: CandidateProfile,
  job: Job
): CompatibilityScoreResult {
  const warnings: string[] = [];

  // Combine extracted skills and user-confirmed skills, normalized
  const candidateSkills = new Set<string>(
    (candidate.userSkills && candidate.userSkills.length > 0
      ? candidate.userSkills
      : candidate.extractedSkills
    ).map((s) => normalizeSkillName(s).toLowerCase())
  );

  const reqSkills = job.requiredSkills || [];
  const prefSkills = job.preferredSkills || [];

  // ==========================================
  // 1. Required Skill Coverage Component (Base 50)
  // ==========================================
  const matchingReq: string[] = [];
  const missingReq: string[] = [];

  for (const s of reqSkills) {
    const norm = normalizeSkillName(s);
    if (candidateSkills.has(norm.toLowerCase())) {
      matchingReq.push(norm);
    } else {
      missingReq.push(norm);
    }
  }

  const hasReqSkills = reqSkills.length > 0;
  const reqFraction = hasReqSkills ? matchingReq.length / reqSkills.length : null;

  // ==========================================
  // 2. Preferred Skill Coverage Component (Base 20)
  // ==========================================
  const matchingPref: string[] = [];
  for (const s of prefSkills) {
    const norm = normalizeSkillName(s);
    if (candidateSkills.has(norm.toLowerCase())) {
      matchingPref.push(norm);
    }
  }

  const hasPrefSkills = prefSkills.length > 0;
  const prefFraction = hasPrefSkills ? matchingPref.length / prefSkills.length : null;

  // ==========================================
  // 3. Experience Alignment Component (Base 20)
  // ==========================================
  let expFraction: number | null = null;
  let expExplanation = "";

  const candidateYrs = candidate.experienceYears;
  const jobMinYrs = job.experienceRange?.minYears ?? null;
  const jobMaxYrs = job.experienceRange?.maxYears ?? null;

  if (candidateYrs === null || (jobMinYrs === null && jobMaxYrs === null)) {
    expFraction = null;
    expExplanation = "Experience alignment unavailable: Candidate or job experience years unspecified.";
  } else {
    // Both sides have verifiable data
    if (jobMinYrs !== null && jobMaxYrs !== null) {
      if (candidateYrs >= jobMinYrs && candidateYrs <= jobMaxYrs + 2) {
        expFraction = 1.0;
        expExplanation = `Experience perfectly aligns with required range (${jobMinYrs}–${jobMaxYrs} yrs).`;
      } else if (candidateYrs >= jobMinYrs - 1 && candidateYrs <= jobMaxYrs + 4) {
        expFraction = 0.7;
        expExplanation = `Experience is close to required range (${jobMinYrs}–${jobMaxYrs} yrs).`;
      } else if (candidateYrs < jobMinYrs) {
        const gap = jobMinYrs - candidateYrs;
        expFraction = Math.max(0, 1 - gap * 0.35);
        expExplanation = `Candidate experience (${candidateYrs} yrs) is below minimum requirement (${jobMinYrs} yrs).`;
      } else {
        expFraction = 0.8;
        expExplanation = `Candidate experience (${candidateYrs} yrs) exceeds range (${jobMinYrs}–${jobMaxYrs} yrs).`;
      }
    } else if (jobMinYrs !== null) {
      if (candidateYrs >= jobMinYrs) {
        expFraction = 1.0;
        expExplanation = `Candidate experience (${candidateYrs} yrs) meets or exceeds ${jobMinYrs}+ yrs requirement.`;
      } else {
        const gap = jobMinYrs - candidateYrs;
        expFraction = Math.max(0, 1 - gap * 0.35);
        expExplanation = `Candidate experience (${candidateYrs} yrs) is below ${jobMinYrs} yrs requirement.`;
      }
    } else {
      expFraction = 1.0;
      expExplanation = "Candidate experience is within acceptable range.";
    }
  }

  // ==========================================
  // 4. Work Arrangement Compatibility Component (Base 10)
  // ==========================================
  let arrFraction: number | null = null;
  let arrExplanation = "";

  const jobArr = job.workArrangement;
  const candidatePreferences = candidate.preferredArrangements || [];

  if (jobArr === "unknown" || candidatePreferences.length === 0) {
    arrFraction = null;
    arrExplanation = "Work arrangement alignment unavailable: Job or candidate preference unspecified.";
  } else {
    if (candidatePreferences.includes(jobArr)) {
      arrFraction = 1.0;
      arrExplanation = `Work arrangement (${jobArr}) directly matches candidate preference.`;
    } else if (
      (jobArr === "hybrid" && candidatePreferences.includes("on-site")) ||
      (jobArr === "on-site" && candidatePreferences.includes("hybrid"))
    ) {
      arrFraction = 0.5;
      arrExplanation = `Partial alignment between ${jobArr} role and candidate preferences.`;
    } else {
      arrFraction = 0.0;
      arrExplanation = `Work model mismatch: Role is ${jobArr}, but candidate prefers ${candidatePreferences.join(", ")}.`;
    }
  }

  // ==========================================
  // Weight Redistribution Algorithm
  // ==========================================
  // Collect active components that have data
  const activeComponents: { key: keyof typeof BASE_WEIGHTS; fraction: number }[] = [];
  const inactiveComponents: (keyof typeof BASE_WEIGHTS)[] = [];

  if (reqFraction !== null) activeComponents.push({ key: "requiredSkills", fraction: reqFraction });
  else inactiveComponents.push("requiredSkills");

  if (prefFraction !== null) activeComponents.push({ key: "preferredSkills", fraction: prefFraction });
  else inactiveComponents.push("preferredSkills");

  if (expFraction !== null) activeComponents.push({ key: "experience", fraction: expFraction });
  else inactiveComponents.push("experience");

  if (arrFraction !== null) activeComponents.push({ key: "workArrangement", fraction: arrFraction });
  else inactiveComponents.push("workArrangement");

  // If no components are evaluatable (e.g. no skills, no experience, no arrangement), return insufficient_data
  if (activeComponents.length === 0 || (reqFraction === null && prefFraction === null && expFraction === null)) {
    return {
      algorithmVersion: ALGORITHM_VERSION,
      overallScore: null,
      status: "insufficient_data",
      summaryText: "Insufficient listing or profile criteria to compute a deterministic match score.",
      matchingRequiredSkills: [],
      missingRequiredSkills: reqSkills,
      matchingPreferredSkills: [],
      components: {
        requiredSkills: {
          score: 0,
          maxWeight: BASE_WEIGHTS.requiredSkills,
          effectiveWeight: 0,
          status: "insufficient_data",
          explanation: "No required skills stated in listing.",
        },
        preferredSkills: {
          score: 0,
          maxWeight: BASE_WEIGHTS.preferredSkills,
          effectiveWeight: 0,
          status: "unavailable",
          explanation: "No preferred skills stated in listing.",
        },
        experience: {
          score: 0,
          maxWeight: BASE_WEIGHTS.experience,
          effectiveWeight: 0,
          status: "unavailable",
          explanation: expExplanation,
        },
        workArrangement: {
          score: 0,
          maxWeight: BASE_WEIGHTS.workArrangement,
          effectiveWeight: 0,
          status: "unavailable",
          explanation: arrExplanation,
        },
      },
      warnings: ["Job listing lacks structured skill prerequisites or experience requirements."],
    };
  }

  // Calculate sum of available base weights
  const availableBaseSum = activeComponents.reduce((acc, c) => acc + BASE_WEIGHTS[c.key], 0);

  // Compute scale multiplier so total active weights equal 100
  const scale = 100 / availableBaseSum;

  let totalScore = 0;
  const breakdowns: Record<keyof typeof BASE_WEIGHTS, ComponentScoreBreakdown> = {
    requiredSkills: {
      score: 0,
      maxWeight: BASE_WEIGHTS.requiredSkills,
      effectiveWeight: 0,
      status: hasReqSkills ? "available" : "unavailable",
      explanation: hasReqSkills
        ? `Matched ${matchingReq.length} of ${reqSkills.length} required skills.`
        : "Job listing does not specify explicit required skills; weight redistributed.",
      details: { matching: matchingReq, missing: missingReq },
    },
    preferredSkills: {
      score: 0,
      maxWeight: BASE_WEIGHTS.preferredSkills,
      effectiveWeight: 0,
      status: hasPrefSkills ? "available" : "unavailable",
      explanation: hasPrefSkills
        ? `Matched ${matchingPref.length} of ${prefSkills.length} preferred skills.`
        : "Job listing does not specify preferred skills; weight redistributed.",
      details: { matching: matchingPref },
    },
    experience: {
      score: 0,
      maxWeight: BASE_WEIGHTS.experience,
      effectiveWeight: 0,
      status: expFraction !== null ? "available" : "unavailable",
      explanation: expExplanation,
    },
    workArrangement: {
      score: 0,
      maxWeight: BASE_WEIGHTS.workArrangement,
      effectiveWeight: 0,
      status: arrFraction !== null ? "available" : "unavailable",
      explanation: arrExplanation,
    },
  };

  for (const c of activeComponents) {
    const effectiveWeight = Math.round(BASE_WEIGHTS[c.key] * scale * 10) / 10;
    const componentScore = Math.round(c.fraction * effectiveWeight * 10) / 10;
    totalScore += componentScore;

    breakdowns[c.key].effectiveWeight = effectiveWeight;
    breakdowns[c.key].score = componentScore;
  }

  // Bound between 0 and 100
  const finalScore = Math.min(100, Math.max(0, Math.round(totalScore)));

  // Generate clear, honest summary text
  let summaryText = "";
  if (finalScore >= 80) {
    summaryText = `High compatibility (${finalScore}/100): Strong alignment with required technical skills and qualifications.`;
  } else if (finalScore >= 50) {
    summaryText = `Moderate compatibility (${finalScore}/100): Matches key skills with a few prerequisite gaps.`;
  } else {
    summaryText = `Low compatibility (${finalScore}/100): Notable gaps in required technical competencies or criteria.`;
  }

  return {
    algorithmVersion: ALGORITHM_VERSION,
    overallScore: finalScore,
    status: "scored",
    summaryText,
    matchingRequiredSkills: matchingReq,
    missingRequiredSkills: missingReq,
    matchingPreferredSkills: matchingPref,
    components: breakdowns,
    warnings,
  };
}
