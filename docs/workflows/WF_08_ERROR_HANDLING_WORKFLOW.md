# WF-08: Error Handling & Fault Containment Workflow

## 1. Purpose & Scope
This workflow specifies the fault tolerance and error handling boundaries across **OneClick Jobs**. It covers external provider timeouts, rate-limit backoffs, corrupt resume uploads, missing job IDs, and AI generation exceptions.

---

## 2. Mermaid Diagram: Error Containment Matrix

```mermaid
flowchart TD
    subgraph ErrorSources["External Failure Points"]
        ERR_ATS["Provider HTTP Timeout / 500 Error<br/>(Greenhouse, Lever, Ashby, RemoteOK)"]
        ERR_RATE["HTTP 429 Rate Limiting<br/>(Public API throttles)"]
        ERR_PDF["Corrupt / Encrypted / Non-PDF Upload<br/>(POST /api/resume/parse)"]
        ERR_AI["Gemini Quota Exceeded / 429 Error<br/>(POST /api/jobs/[id]/ai-analysis)"]
        ERR_DB["Database Network Disconnect<br/>(Supabase PostgREST failure)"]
    end

    subgraph ContainmentStrategies["Architectural Containment & Mitigation"]
        TIMEOUT_H["AbortController with 6s Timeout<br/>• Drops stalled provider<br/>• Completes others in Promise.allSettled()"]
        BACKOFF_H["Exponential Backoff & Cached State<br/>• Serves cached listings from MemoryCache<br/>• Backs off request rate"]
        VALID_H["MIME & Buffer Sanity Checks<br/>• Rejects files > 5MB<br/>• Catches unpdf parse errors<br/>• Returns 400 Bad Request with actionable message"]
        FALLBACK_AI["DeterministicFallbackProvider<br/>• Transparent rules-based generation<br/>• Zero client-visible disruption"]
        FALLBACK_DB["InMemoryJobRepository Fallback<br/>• Seamlessly serves in-memory fixtures<br/>• Logs warning, suppresses 500"]
    end

    ERR_ATS --> TIMEOUT_H
    ERR_RATE --> BACKOFF_H
    ERR_PDF --> VALID_H
    ERR_AI --> FALLBACK_AI
    ERR_DB --> FALLBACK_DB

    subgraph ClientImpact["Client User Experience"]
        UX_OK["Graceful UX Degradation<br/>• Feed loads without delay<br/>• User receives clear toast notification<br/>• Zero unhandled white-screen crashes"]
    end

    TIMEOUT_H --> UX_OK
    BACKOFF_H --> UX_OK
    VALID_H --> UX_OK
    FALLBACK_AI --> UX_OK
    FALLBACK_DB --> UX_OK
```

---

## 3. Failure Domain Mitigation Policies

| Failure Scenario | Triggering Condition | Containment Strategy | Client User Experience |
|---|---|---|---|
| **External ATS Stalled** | Provider takes > 6000ms to respond | `AbortController` triggers `abort()`; `Promise.allSettled` discards slow source | Other provider feeds render immediately; missing provider is logged |
| **PDF Extraction Error** | Encrypted or damaged PDF uploaded | `try/catch` in `src/server/resume/skills.ts` catches unpdf parse exception | Form highlights error: "Unable to parse resume. Please ensure it is an unencrypted PDF." |
| **Gemini API Down / Throttled** | Gemini returns 429 Too Many Requests or 503 Service Unavailable | `GeminiAIProvider` catches exception and immediately delegates to `DeterministicFallbackProvider` | Fit summary and cover letter starter render without interruption |
| **Supabase Outage** | PostgREST returns 500 or times out | `SupabaseJobRepository` catches error and queries in-memory fallback | Feed continues displaying jobs without throwing 500 Internal Server Error |
| **Delisted Job Request** | User accesses link for job removed from ATS board | `GET /api/jobs/[id]` checks live provider, returns 404 | Modal displays: "This position is no longer active on the employer board." |
