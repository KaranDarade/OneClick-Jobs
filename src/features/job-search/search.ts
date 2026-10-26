import { Job, SearchFilters, SearchResult } from "@/types/job";
import { DEMO_JOBS } from "./fixtures";
import { matchesLocationFilter } from "@/server/jobs/locations";
import { normalizeSkillName } from "@/server/jobs/skills";

/**
 * Filter, search and sort jobs against an arbitrary dataset or default demo jobs.
 * Supports referenceDate injection to ensure deterministic time calculations in tests.
 */
export function filterAndSortJobs(
  filters: SearchFilters,
  customJobs?: Job[],
  referenceDate?: Date
): SearchResult {
  const dataset = customJobs || DEMO_JOBS;
  const now = referenceDate ? referenceDate.getTime() : Date.now();
  const query = (filters.query || "").trim().toLowerCase();
  const normalizedQuerySkill = query ? normalizeSkillName(query).toLowerCase() : "";

  const filtered = dataset.filter((job) => {
    // 1. Text Search (title, company, requiredSkills, description)
    if (query) {
      const matchTitle = job.title.toLowerCase().includes(query);
      const matchCompany = job.company.toLowerCase().includes(query);
      const matchSkills = job.requiredSkills.some((s) => {
        const lowerS = s.toLowerCase();
        // Exact match or word boundary check to avoid sub-word matching (e.g. 'java' matching 'javascript')
        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const queryRegex = new RegExp(`(^|[^a-z0-9])${escapedQuery}([^a-z0-9]|$)`, "i");
        const matchesQuery = queryRegex.test(lowerS);

        let matchesNormalized = false;
        if (normalizedQuerySkill) {
          const escapedNormalized = normalizedQuerySkill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const normRegex = new RegExp(`(^|[^a-z0-9])${escapedNormalized}([^a-z0-9]|$)`, "i");
          matchesNormalized = normRegex.test(lowerS);
        }

        return matchesQuery || matchesNormalized;
      });
      const matchDesc = job.description.toLowerCase().includes(query);

      if (!matchTitle && !matchCompany && !matchSkills && !matchDesc) {
        return false;
      }
    }

    // 2. Centralized Location Filtering (Location aliases, Delhi NCR grouping, remote)
    if (filters.location && filters.location !== "All India" && filters.location !== "all") {
      const isLocMatch = matchesLocationFilter(
        {
          city: job.normalizedCity,
          state: job.normalizedState,
          original: job.originalLocation,
          isIndiaRemote: job.remoteEligibility?.toLowerCase().includes("india") || false,
          workArrangement: job.workArrangement,
        },
        filters.location
      );
      if (!isLocMatch) {
        return false;
      }
    }

    // 3. Work Arrangement (Multiple Checkboxes)
    if (filters.workArrangements && filters.workArrangements.length > 0) {
      if (!filters.workArrangements.includes(job.workArrangement)) {
        return false;
      }
    }

    // 4. Experience Level (Multiple Checkboxes)
    if (filters.experienceLevels && filters.experienceLevels.length > 0) {
      if (!filters.experienceLevels.includes(job.experienceLevel)) {
        return false;
      }
    }

    // 5. Employment Type (Multiple Checkboxes)
    if (filters.employmentTypes && filters.employmentTypes.length > 0) {
      if (!filters.employmentTypes.includes(job.employmentType)) {
        return false;
      }
    }

    // 6. Posting Age (Days: '1', '3', '7', '15', '30')
    if (filters.postingAge) {
      if (!job.postedAt) {
        // Unknown or missing posting dates are not classified as newly posted
        return false;
      }
      const days = parseInt(filters.postingAge, 10);
      if (!isNaN(days)) {
        const postedTime = new Date(job.postedAt).getTime();
        if (isNaN(postedTime)) {
          return false;
        }
        const cutoffTime = now - days * 24 * 60 * 60 * 1000;
        if (postedTime < cutoffTime) {
          return false;
        }
      }
    }

    return true;
  });

  // Sorting
  const sorted = [...filtered].sort((a, b) => {
    switch (filters.sortBy) {
      case "newest": {
        const timeA = a.postedAt ? new Date(a.postedAt).getTime() : 0;
        const timeB = b.postedAt ? new Date(b.postedAt).getTime() : 0;
        if (timeA !== timeB) return timeB - timeA;
        return a.id.localeCompare(b.id);
      }
      case "match-score": {
        const scoreA = Number(a.providerMeta?.matchScore || 0);
        const scoreB = Number(b.providerMeta?.matchScore || 0);
        if (scoreA !== scoreB) return scoreB - scoreA;
        return a.id.localeCompare(b.id);
      }
      case "salary-high": {
        const salA = a.salaryMax || a.salaryMin || 0;
        const salB = b.salaryMax || b.salaryMin || 0;
        if (salA !== salB) return salB - salA;
        return a.id.localeCompare(b.id);
      }
      case "relevance":
      default: {
        // If there's a query, prioritize title matches
        if (query) {
          const aTitle = a.title.toLowerCase().includes(query) ? 1 : 0;
          const bTitle = b.title.toLowerCase().includes(query) ? 1 : 0;
          if (aTitle !== bTitle) return bTitle - aTitle;
        }
        const timeA = a.postedAt ? new Date(a.postedAt).getTime() : 0;
        const timeB = b.postedAt ? new Date(b.postedAt).getTime() : 0;
        if (timeA !== timeB) return timeB - timeA;
        return a.id.localeCompare(b.id);
      }
    }
  });

  return {
    jobs: sorted,
    totalCount: sorted.length,
    filters,
  };
}

export function getJobById(id: string, customJobs?: Job[]): Job | undefined {
  const dataset = customJobs || DEMO_JOBS;
  return dataset.find((j) => j.id === id);
}
