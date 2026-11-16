# API-06: AI Analysis Sequence Diagram (`POST /api/jobs/[id]/ai-analysis`)

## 1. Sequence Diagram: AI Analysis & Cover Letter Generation

```mermaid
sequenceDiagram
    autonumber
    actor Candidate as Job Seeker
    participant Modal as AiMatchAssistant.tsx
    participant Route as POST /api/jobs/[id]/ai-analysis
    participant Gateway as getAIProvider()
    participant Gemini as GeminiAIProvider
    participant Google as Gemini 2.0 Flash (generativelanguage.googleapis.com)
    participant Fallback as DeterministicFallbackProvider

    Candidate->>Modal: Click "Analyze with AI"
    Modal->>Route: POST { candidate: CandidateContext, breakdown: ScoreResult }
    Route->>Gateway: getAIProvider()

    alt GEMINI_API_KEY Configured
        Gateway-->>Route: GeminiAIProvider
        Route->>Gemini: generateMatchExplanation(job, candidate, breakdown)
        Gemini->>Google: POST /v1beta/models/gemini-2.0-flash:generateContent
        
        alt Google Responds Successfully
            Google-->>Gemini: Return Structured JSON
            Gemini-->>Route: AIMatchAnalysis Object
        else API Rate Limited (429) or Network Timeout
            Google-->>Gemini: Error / Timeout
            Gemini->>Fallback: generateMatchExplanation(job, candidate, breakdown)
            Fallback-->>Gemini: Deterministic Fallback Analysis
            Gemini-->>Route: AIMatchAnalysis Object
        end
    else No Gemini API Key
        Gateway-->>Route: DeterministicFallbackProvider
        Route->>Fallback: generateMatchExplanation(job, candidate, breakdown)
        Fallback-->>Route: Deterministic Fallback Analysis
    end

    Route-->>Modal: 200 OK JSON { fitSummary, strengths, growthAreas, coverLetterStarter }
    Modal-->>Candidate: Render AI Analysis & Editable Cover Letter Starter
```

---

## 2. Guaranteed Delivery
The AI endpoint implements zero-failure fallbacks: if Google Gemini experiences an upstream failure, candidates immediately receive high-quality deterministic insights without noticing an error.
