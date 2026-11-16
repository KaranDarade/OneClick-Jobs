# WF-06: Saved Jobs & Bookmarks Workflow

## 1. Purpose & Scope
This workflow specifies how candidates bookmark, organize, and access saved job opportunities. It details the client-side state management using `useSavedJobs()`, browser persistence via `localStorage`, and the optional cloud synchronization path with Supabase `saved_jobs`.

---

## 2. Mermaid Diagram: Saved Jobs Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor User as Candidate
    participant Card as JobCard Component
    participant Hook as useSavedJobs() Hook
    participant Local as localStorage ('oneclick_saved_jobs_v1')
    participant Header as Navigation Header
    participant Supa as Supabase (saved_jobs Table)

    User->>Card: Click Bookmark Icon (Save / Unsave)
    Card->>Hook: toggleSave(job)
    
    alt Job is not currently saved
        Hook->>Hook: Append job to savedJobs array
        Hook->>Local: setItem('oneclick_saved_jobs_v1', JSON.stringify(savedJobs))
        Hook->>Header: Update Saved Badge Count (e.g. "Saved (3)")
        
        opt Supabase Cloud Sync Enabled
            Hook->>Supa: POST /rest/v1/saved_jobs { user_id, job_id }
            Supa-->>Hook: 201 Created
        end
        Card-->>User: Bookmark icon active (Filled gold / blue)
    else Job is already saved
        Hook->>Hook: Remove job from savedJobs array
        Hook->>Local: setItem('oneclick_saved_jobs_v1', JSON.stringify(savedJobs))
        Hook->>Header: Decrement Saved Badge Count
        
        opt Supabase Cloud Sync Enabled
            Hook->>Supa: DELETE /rest/v1/saved_jobs?job_id=eq.X
            Supa-->>Hook: 204 No Content
        end
        Card-->>User: Bookmark icon inactive (Outline)
    end

    User->>Header: Click "Saved Jobs" Tab
    Header->>User: Filter feed to render only savedJobs collection
```

---

## 3. Data Integrity & Sync Behaviors
1. **Offline Resilience**: Saved jobs work 100% reliably without user login or database connectivity by leveraging client `localStorage`.
2. **Cascade Deletion**: In Supabase, `saved_jobs.job_id` has an `ON DELETE CASCADE` constraint. If a job is purged from the `jobs` catalog, the corresponding bookmark is automatically removed.
3. **Payload Snapshot**: The browser stores both the `jobId` and essential preview fields (title, company, location, URL) so that bookmarked jobs can still be inspected even if offline.
