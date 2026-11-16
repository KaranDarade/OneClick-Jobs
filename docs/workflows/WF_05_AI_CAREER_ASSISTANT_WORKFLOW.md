# WF-05: AI Career Assistant & Analysis Workflow

## 1. Purpose & Scope
This workflow specifies the AI Career Assistant execution model in **OneClick Jobs**. It traces the path from user invocation in `AiMatchAssistant.tsx` through Next.js server route handlers to Google Gemini 2.0 Flash, including prompt generation and graceful fallback to the local deterministic rules engine.

---

## 2. Mermaid Diagram: AI Career Assistant Sequence

```mermaid
sequenceDiagram
    autonumber
    actor User as Candidate
    participant UI as AiMatchAssistant Component
    participant Route as POST /api/jobs/[id]/ai-analysis
    participant Gateway as getAIProvider()
    participant Gemini as GeminiAIProvider
    participant Fallback as DeterministicFallbackProvider
    participant Google as Google Gemini 2.0 Flash API

    User->>UI: Click "Generate AI Fit Analysis"
    UI->>Route: POST { candidate: CandidateContext, breakdown: CompatibilityScoreResult }
    
    Route->>Gateway: getAIProvider()
    
    alt GEMINI_API_KEY Configured
        Gateway-->>Route: Return GeminiAIProvider instance
        Route->>Gemini: generateMatchExplanation(job, candidate, breakdown)
        
        Gemini->>Google: POST /v1beta/models/gemini-2.0-flash:generateContent
        Note over Google: Structured JSON prompt: fitSummary, strengths, growthAreas, coverLetterStarter
        
        alt Google Responds 200 OK
            Google-->>Gemini: Return JSON parts
            Gemini-->>Route: Return AIMatchAnalysis
        else Google Quota Exceeded (429) or Network Timeout
            Google-->>Gemini: HTTP Error
            Note over Gemini: Catch exception and activate transparent fallback
            Gemini->>Fallback: generateMatchExplanation(job, candidate, breakdown)
            Fallback-->>Gemini: Return deterministic rules-based AIMatchAnalysis
            Gemini-->>Route: Return AIMatchAnalysis
        end
    else No Gemini API Key Configured
        Gateway-->>Route: Return DeterministicFallbackProvider instance
        Route->>Fallback: generateMatchExplanation(job, candidate, breakdown)
        Fallback-->>Route: Return deterministic rules-based AIMatchAnalysis
    end

    Route-->>UI: 200 OK JSON { fitSummary, strengths, growthAreas, interviewTips, coverLetterStarter }
    UI-->>User: Render Fit Summary, Missing Skills Badges, & Cover Letter Starter
```

---

## 3. Prompt Engineering & Deterministic Fallback Rules

### 3.1 Gemini 2.0 Flash System Prompt
The LLM is prompted strictly to return a JSON object:
```json
{
  "fitSummary": "A concise 2-sentence executive summary of the candidate's alignment",
  "strengths": ["string", "string"],
  "growthAreas": ["string", "string"],
  "interviewTips": ["string", "string"],
  "coverLetterStarter": "A personalized 3-sentence opening paragraph for a cover letter addressed to company"
}
```

### 3.2 Deterministic Fallback Rules
If no network or API key is available, `DeterministicFallbackProvider` guarantees zero disruption:
- **Score $\ge 80\%$**: Generates praise for core required stack alignment and highlights top matching skills.
- **Score $50-79\%$**: Flags key matching competencies while highlighting up to 3 missing skill prerequisites.
- **Score $< 50\%$**: Flags the role as a growth opportunity and recommends targeted portfolio projects.
- **Cover Letter Starter**: Assembles a customized, professionally phrased opening paragraph using company name, role title, and top 2 matched candidate skills.
