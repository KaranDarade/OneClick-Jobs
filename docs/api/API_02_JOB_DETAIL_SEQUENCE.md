# API-02: Job Detail Lookup Sequence Diagram (`GET /api/jobs/[id]`)

## 1. Sequence Diagram: Job Detail Resolution

```mermaid
sequenceDiagram
    autonumber
    actor Candidate as Browser / Client
    participant API as GET /api/jobs/[id]
    participant GH as GreenhouseClient
    participant Lever as LeverClient
    participant Ashby as AshbyClient
    participant Demo as DEMO_JOBS Fixtures

    Candidate->>API: GET /api/jobs/greenhouse:stripe-482910
    API->>API: Decode ID & extract prefix ("greenhouse:")

    alt Prefix is "demo:"
        API->>Demo: findById(externalId)
        Demo-->>API: Demo Job Object
        API-->>Candidate: 200 OK { job, source: "demo" }
    else Prefix is "greenhouse:"
        API->>GH: getJobById("stripe-482910")
        alt Job Exists on Public Board
            GH-->>API: Full Job Details & Description
            API-->>Candidate: 200 OK { job, source: "live" }
        else Job Delisted / Removed Upstream
            GH-->>API: null
            API-->>Candidate: 404 Not Found { error: "Job no longer active" }
        end
    else Prefix is "lever:"
        API->>Lever: getJobById(externalId)
        Lever-->>API: Job / null
        API-->>Candidate: 200 OK or 404
    else Prefix is "ashby:"
        API->>Ashby: getJobById(externalId)
        Ashby-->>API: Job / null
        API-->>Candidate: 200 OK or 404
    end
```

---

## 2. Dynamic Provider Routing
The route handler dynamically parses the composite ID prefix (`{provider}:{externalId}`) to invoke the correct client without executing exhaustive scans across all upstream systems.
