# API-04: Resume Upload & Parsing Sequence Diagram (`POST /api/resume/parse`)

## 1. Sequence Diagram: Privacy-First Resume Parsing

```mermaid
sequenceDiagram
    autonumber
    actor Candidate as Job Seeker
    participant UI as ResumeUpload.tsx
    participant Route as POST /api/resume/parse
    participant RAM as Ephemeral Buffer
    participant UNPDF as unpdf Library
    participant Skills as Skill Taxonomy Engine
    participant Storage as Browser sessionStorage

    Candidate->>UI: Selects resume.pdf (< 5MB)
    UI->>Route: POST /api/resume/parse (multipart/form-data)

    Route->>RAM: Buffer stream in volatile memory
    Route->>UNPDF: extractText(buffer)
    UNPDF-->>Route: Clean text content

    Route->>Skills: extractResumeSkills() & inferSeniority()
    Note over Skills: Identifies skills, fresher status (0 exp), & projects
    Skills-->>Route: CandidateProfile JSON

    Route->>RAM: Clear buffer from memory
    Route-->>UI: 200 OK { success: true, profile }

    UI->>Storage: setItem("oneclick_candidate_profile_v1", profile)
    UI-->>Candidate: Profile successfully loaded
```

---

## 2. Zero-Retention Security Architecture
- The resume file binary exists strictly inside the scope of the HTTP request.
- No database records, S3 buckets, or temporary filesystem files are created.
- The browser stores the resulting structured profile strictly in `sessionStorage`, ensuring it is cleared when the browser tab is closed.
