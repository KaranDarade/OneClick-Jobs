# API-05: Compatibility Scoring Loop Sequence Diagram

## 1. Sequence Diagram: Client-Side Dynamic Scoring Loop

```mermaid
sequenceDiagram
    autonumber
    actor Candidate as Job Seeker
    participant UI as JobCard / Feed Component
    participant Hook as useCandidateProfile()
    participant Engine as calculateMatchScore() (Client Execution)
    participant Badge as MatchBadge Component

    Candidate->>Hook: Profile updated (Skills: React, Next.js, Node.js)
    Hook->>UI: Broadcast new CandidateProfile to Feed

    loop For each visible JobCard in Feed
        UI->>Engine: calculateMatchScore(candidate, job)
        Note over Engine: Weighted Harmonic Score:<br/>0.60 * Skills + 0.25 * Exp + 0.15 * Loc - Penalty
        Engine-->>UI: CompatibilityScoreResult { overallScore: 88, matchingSkills, missingSkills }
        UI->>Badge: Render Badge ("88% Match", Strong Match)
    end

    Candidate->>UI: Manually adds "TypeScript" skill chip
    Note over UI: Recomputes entire feed scores in <5ms without HTTP round-trip!
    UI->>Badge: Update Badges ("95% Match")
```

---

## 2. High-Performance Client Execution
Because `src/server/matching/scoring.ts` is pure TypeScript without Node.js-specific imports, it executes directly inside the React 19 client runtime. This eliminates network latency when candidates tweak their skills or experience sliders.
