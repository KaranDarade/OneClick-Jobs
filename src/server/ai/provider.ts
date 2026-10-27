import { Job } from "@/types/job";
import { CompatibilityScoreResult } from "@/types/matching";
import { AIMatchAnalysis, CandidateContext } from "@/types/ai";

export interface IAIProvider {
  generateMatchExplanation(
    job: Job,
    candidate: CandidateContext,
    breakdown?: CompatibilityScoreResult
  ): Promise<AIMatchAnalysis>;
}

export class DeterministicFallbackProvider implements IAIProvider {
  async generateMatchExplanation(
    job: Job,
    candidate: CandidateContext,
    breakdown?: CompatibilityScoreResult
  ): Promise<AIMatchAnalysis> {
    const matchedSkills = breakdown
      ? [...breakdown.matchingRequiredSkills, ...breakdown.matchingPreferredSkills]
      : [];
    const missingSkills = breakdown?.missingRequiredSkills || [];
    const score = breakdown?.overallScore ?? 70;

    let fitSummary = "";
    if (score >= 80) {
      fitSummary = `Strong match (${score}%) for ${job.title} at ${job.company}. Your core technical background in ${
        matchedSkills.slice(0, 3).join(", ") || "the required stack"
      } directly matches their primary requirements.`;
    } else if (score >= 50) {
      fitSummary = `Moderate alignment (${score}%) for ${job.title}. You have demonstrated competence in ${
        matchedSkills.slice(0, 2).join(", ") || "key areas"
      }, though gaining proficiency in ${missingSkills.slice(0, 2).join(", ") || "additional tools"} will strengthen your application.`;
    } else {
      fitSummary = `Growth opportunity (${score}%) for ${job.title}. While your skill set overlaps in some areas, this position emphasizes ${
        job.requiredSkills.slice(0, 3).join(", ") || "specialized skills"
      } which are not prominent on your resume.`;
    }

    const strengths: string[] = [];
    if (matchedSkills.length > 0) {
      strengths.push(`Direct alignment on core stack: ${matchedSkills.slice(0, 4).join(", ")}`);
    }
    const isJobRemote = job.workArrangement === "remote";
    if (isJobRemote && candidate.preferredArrangement === "remote") {
      strengths.push("Location preference matches fully (100% remote opening)");
    } else if (job.normalizedCity) {
      strengths.push(`Position based in ${job.normalizedCity}, an active technology hub`);
    }

    const growthAreas: string[] = [];
    if (missingSkills.length > 0) {
      growthAreas.push(`Familiarize yourself with: ${missingSkills.slice(0, 3).join(", ")}`);
    }
    const minYears = job.experienceRange?.minYears;
    if (minYears && candidate.experienceYears && candidate.experienceYears < minYears) {
      growthAreas.push(
        `Role targets ${minYears}+ years; emphasize high-impact project outcomes in lieu of tenure`
      );
    }

    const interviewTips = [
      `Review production patterns for ${matchedSkills[0] || "core system architecture"} and explain your past architectural trade-offs.`,
      `Be prepared to walk through your debugging strategy and high-load performance optimizations.`,
      `Demonstrate knowledge of ${job.company}'s engineering culture and recent product developments.`,
    ];

    const topSkills = matchedSkills.slice(0, 3).join(", ") || "software engineering";
    const coverLetterStarter = `Dear ${job.company} Hiring Team,\n\nI am writing to express my strong interest in the ${job.title} position at ${job.company}. With hands-on experience developing reliable applications using ${topSkills}, I have consistently delivered high-quality solutions that align with your technical mission. I am excited about the opportunity to contribute to your engineering organization in ${job.normalizedCity || "India"}.`;

    return {
      fitSummary,
      strengths,
      growthAreas,
      interviewTips,
      coverLetterStarter,
      isAiGenerated: false,
      model: "deterministic-rules-v1",
    };
  }
}

export class GeminiAIProvider implements IAIProvider {
  private apiKey: string;
  private fallback: DeterministicFallbackProvider;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.fallback = new DeterministicFallbackProvider();
  }

  async generateMatchExplanation(
    job: Job,
    candidate: CandidateContext,
    breakdown?: CompatibilityScoreResult
  ): Promise<AIMatchAnalysis> {
    try {
      const allExtractedSkills = [...job.requiredSkills, ...job.preferredSkills];
      const matched = breakdown
        ? [...breakdown.matchingRequiredSkills, ...breakdown.matchingPreferredSkills]
        : [];
      const prompt = `You are an expert technical career coach and recruiter.
Analyze this candidate match for a software engineering job in India:
Job Title: ${job.title}
Company: ${job.company}
Location: ${job.normalizedCity || "India"} (${job.workArrangement})
Required Skills: ${allExtractedSkills.join(", ")}
Candidate Skills: ${candidate.skills.join(", ")}
Matched Skills: ${matched.join(", ")}
Missing Skills: ${(breakdown?.missingRequiredSkills || []).join(", ")}
Compatibility Score: ${breakdown?.overallScore ?? 70}%

Respond strictly with a JSON object in this exact structure:
{
  "fitSummary": "A concise 2-sentence executive summary of the candidate's alignment",
  "strengths": ["string", "string"],
  "growthAreas": ["string", "string"],
  "interviewTips": ["string", "string"],
  "coverLetterStarter": "A personalized 3-sentence opening paragraph for a cover letter addressed to ${job.company}"
}`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" },
          }),
        }
      );

      if (!res.ok) {
        return this.fallback.generateMatchExplanation(job, candidate, breakdown);
      }

      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        return this.fallback.generateMatchExplanation(job, candidate, breakdown);
      }

      const parsed = JSON.parse(rawText);
      return {
        fitSummary: parsed.fitSummary || "",
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
        growthAreas: Array.isArray(parsed.growthAreas) ? parsed.growthAreas : [],
        interviewTips: Array.isArray(parsed.interviewTips) ? parsed.interviewTips : [],
        coverLetterStarter: parsed.coverLetterStarter || "",
        isAiGenerated: true,
        model: "gemini-2.0-flash",
      };
    } catch {
      return this.fallback.generateMatchExplanation(job, candidate, breakdown);
    }
  }
}

let aiProviderInstance: IAIProvider | null = null;

export function getAIProvider(): IAIProvider {
  if (aiProviderInstance) return aiProviderInstance;

  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (geminiKey) {
    aiProviderInstance = new GeminiAIProvider(geminiKey);
  } else {
    aiProviderInstance = new DeterministicFallbackProvider();
  }

  return aiProviderInstance;
}
