# API-01: Job Search Sequence Diagram (`GET /api/jobs`)

## 1. Sequence Diagram: Job Search & Filter Execution

```mermaid
sequenceDiagram
    autonumber
    actor Candidate as Browser / Client
    participant API as GET /api/jobs
    participant Cache as globalJobsAggregateCache
    participant Harvester as Live Aggregator
    participant Engine as filterAndSortJobs()

    Candidate->>API: GET /api/jobs?q=react&experience=fresher&location=Bengaluru&sort=relevance
    API->>Cache: get("software_jobs_aggregate")
    
    alt Cache Hit (within 10m TTL)
        Cache-->>API: Return Cached Software Jobs
    else Cache Miss or refresh=true
        API->>Harvester: Fetch Greenhouse, Lever, Ashby, RemoteOK
        Harvester-->>API: Raw Jobs Aggregated
        API->>API: Apply isSoftwareEngineeringJob() & deduplicateJobs()
        API->>Cache: set("software_jobs_aggregate", cleanJobs, 10m)
    end

    API->>Engine: filterAndSortJobs(cleanJobs, filters, sort)
    Note over Engine: Filters by discipline, fresher status, location alias & keywords
    Engine-->>API: Filtered & Sorted JobListings

    API-->>Candidate: 200 OK JSON { jobs, total, sources, cached }
```

---

## 2. Key Edge Cases Handled
1. **Empty Query Parameter (`q=""`)**: Returns the full curated tech job feed without text filtering.
2. **Force Refresh (`refresh=true`)**: Invalidates the 10-minute in-memory cache and triggers immediate re-harvesting from active ATS providers.
3. **Location Aliases**: Queries for `"Bengaluru"` match postings tagged with `"Bangalore"`, `"Whitefield"`, or `"BLR"`.
