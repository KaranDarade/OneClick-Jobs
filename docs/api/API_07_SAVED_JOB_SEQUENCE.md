# API-07: Saved Jobs Persistence Sequence Diagram

## 1. Sequence Diagram: Job Bookmarking & State Persistence

```mermaid
sequenceDiagram
    autonumber
    actor Candidate as Job Seeker
    participant Card as JobCard.tsx
    participant Hook as useSavedJobs() Hook
    participant Storage as Browser localStorage
    participant Header as Navigation Header
    participant Cloud as Supabase (Optional)

    Candidate->>Card: Click Bookmark Icon
    Card->>Hook: toggleSave(job)

    alt Saving New Job
        Hook->>Hook: Append to savedJobs[]
        Hook->>Storage: setItem('oneclick_saved_jobs_v1', savedJobs)
        Hook->>Header: Update Saved Badge Count (e.g. "Saved (3)")
        
        opt Supabase Configured
            Hook->>Cloud: POST /rest/v1/saved_jobs { user_id, job_id }
            Cloud-->>Hook: 201 Created
        end
        Card-->>Candidate: Bookmark active (Filled Icon)
    else Removing Saved Job
        Hook->>Hook: Filter out job
        Hook->>Storage: setItem('oneclick_saved_jobs_v1', savedJobs)
        Hook->>Header: Decrement Badge Count
        
        opt Supabase Configured
            Hook->>Cloud: DELETE /rest/v1/saved_jobs?job_id=eq.X
            Cloud-->>Hook: 204 No Content
        end
        Card-->>Candidate: Bookmark removed (Outline Icon)
    end
```

---

## 2. Browser Storage Key
Saved jobs are serialized in `localStorage` under `oneclick_saved_jobs_v1`, surviving browser refreshes and tab closures.
