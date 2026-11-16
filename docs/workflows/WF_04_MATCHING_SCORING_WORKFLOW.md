# WF-04: Candidate-Job Compatibility Scoring Workflow

## 1. Purpose & Scope
This workflow specifies the mathematical scoring model and evaluation pipeline implemented in `src/server/matching/scoring.ts`. The algorithm computes an objective, multi-factor compatibility score ($0-100\%$) between a candidate's profile and a job vacancy.

---

## 2. Mermaid Diagram: Scoring Pipeline

```mermaid
flowchart TD
    CANDIDATE["Candidate Profile<br/>• Skills[]<br/>• Experience Years<br/>• Preferred Location / Arrangement"] --> INPUT_PREP
    JOB["Job Vacancy<br/>• Required Skills[]<br/>• Preferred Skills[]<br/>• Min/Max Experience<br/>• Work Arrangement & City"] --> INPUT_PREP

    subgraph ScoringEngine["Scoring Engine (src/server/matching/scoring.ts)"]
        INPUT_PREP["Normalize Skills & Case Fold"] --> SKILL_EVAL
        
        subgraph SkillEvaluation["1. Skill Overlap (Weight: 60%)"]
            SKILL_EVAL["Calculate Required Skills Match<br/>matchedReq / totalReq"]
            SKILL_EVAL --> SKILL_PREF["Calculate Preferred Skills Match<br/>matchedPref / totalPref"]
            SKILL_PREF --> COMBINED_SKILL["Weighted Skill Score (0 - 100)"]
        end

        COMBINED_SKILL --> EXP_EVAL

        subgraph ExpEvaluation["2. Experience Alignment (Weight: 25%)"]
            EXP_EVAL{"Candidate Exp vs Job Range"}
            EXP_EVAL -- "Exp >= minYears" --> FULL_EXP["Score = 100"]
            EXP_EVAL -- "Exp within 1 yr of min" --> NEAR_EXP["Score = 75"]
            EXP_EVAL -- "Exp < minYears - 1" --> DEFICIT_EXP["Score = max(20, 100 - deficit * 25)"]
            EXP_EVAL -- "No exp specified in job" --> NEUTRAL_EXP["Score = 80"]
        end

        FULL_EXP & NEAR_EXP & DEFICIT_EXP & NEUTRAL_EXP --> LOC_EVAL

        subgraph LocEvaluation["3. Location & Arrangement (Weight: 15%)"]
            LOC_EVAL{"Arrangement & City Match?"}
            LOC_EVAL -- "Both Remote" --> FULL_LOC["Score = 100"]
            LOC_EVAL -- "Same City" --> CITY_LOC["Score = 100"]
            LOC_EVAL -- "Hybrid & Nearby" --> HYBRID_LOC["Score = 70"]
            LOC_EVAL -- "Mismatch (Onsite vs Remote)" --> MISMATCH_LOC["Score = 30"]
        end

        FULL_LOC & CITY_LOC & HYBRID_LOC & MISMATCH_LOC --> AGGREGATE["Aggregate Raw Weighted Score:<br/>Raw = 0.60 * Skill + 0.25 * Exp + 0.15 * Loc"]

        AGGREGATE --> PENALTY_CHECK{"Seniority Mismatch?<br/>(Fresher applying for Senior/Lead)"}
        PENALTY_CHECK -- Yes --> APPLY_PENALTY["Subtract Seniority Penalty (P = 30)"]
        PENALTY_CHECK -- No --> CLAMP
        APPLY_PENALTY --> CLAMP["Clamp to [0, 100]"]
    end

    CLAMP --> RESULT["Return CompatibilityScoreResult<br/>• overallScore (0-100)<br/>• compatibilityLevel ('high' | 'medium' | 'low')<br/>• matchingRequiredSkills[]<br/>• missingRequiredSkills[]"]
```

---

## 3. Mathematical Formula & Weight Distribution

The overall compatibility score $S$ is defined as:
$$S = \max\left(0, \min\left(100, W_s \cdot S_{\text{skills}} + W_e \cdot S_{\text{exp}} + W_l \cdot S_{\text{loc}} - P_{\text{seniority}}\right)\right)$$

### 3.1 Weight Breakdown
- **$W_s = 0.60$ (Skills Overlap)**:
  $$S_{\text{skills}} = \left(\frac{|\text{CandidateSkills} \cap \text{JobRequiredSkills}|}{\max(1, |\text{JobRequiredSkills}|)} \times 0.80 + \frac{|\text{CandidateSkills} \cap \text{JobPreferredSkills}|}{\max(1, |\text{JobPreferredSkills}|)} \times 0.20\right) \times 100$$
- **$W_e = 0.25$ (Experience Alignment)**:
  - If $\text{CandidateExp} \ge \text{MinYears}$: $S_{\text{exp}} = 100$.
  - If candidate is a Fresher and job is tagged `fresher` or `internship`: $S_{\text{exp}} = 100$.
  - If $\text{CandidateExp} < \text{MinYears}$: Penalized proportionally down to $20$.
- **$W_l = 0.15$ (Location & Work Mode)**:
  - Remote-to-Remote match: $100$.
  - Canonical city match (e.g. candidate in Bengaluru, job in Bengaluru): $100$.
- **$P_{\text{seniority}} = 30$ (Seniority Dampener)**:
  - Triggered when candidate experience is 0 years (fresher) and target job has `experienceLevel: "senior"` or `"lead"`. Prevents candidates from receiving misleading high scores on senior architect openings based solely on general programming keyword overlap.

### 3.2 Compatibility Level Thresholds
- **High / Strong Match**: $S \ge 75\%$
- **Medium / Good Match**: $50\% \le S < 75\%$
- **Low / Growth Opportunity**: $S < 50\%$
