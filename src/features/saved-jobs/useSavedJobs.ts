"use client";

import { useState, useEffect, useCallback } from "react";
import { SavedJob } from "@/types/job";

const STORAGE_KEY = "oneclick_saved_jobs_v1";

export function useSavedJobs() {
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSavedJobs(JSON.parse(stored));
      }
    } catch {
      // In SSR or if localStorage is restricted
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const saveJob = useCallback((jobId: string) => {
    setSavedJobs((prev) => {
      if (prev.some((item) => item.jobId === jobId)) return prev;
      const updated = [...prev, { jobId, savedAt: new Date().toISOString() }];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.error("Failed to save job to localStorage", err);
      }
      return updated;
    });
  }, []);

  const removeJob = useCallback((jobId: string) => {
    setSavedJobs((prev) => {
      const updated = prev.filter((item) => item.jobId !== jobId);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.error("Failed to remove job from localStorage", err);
      }
      return updated;
    });
  }, []);

  const toggleSave = useCallback(
    (jobId: string) => {
      if (savedJobs.some((j) => j.jobId === jobId)) {
        removeJob(jobId);
      } else {
        saveJob(jobId);
      }
    },
    [savedJobs, removeJob, saveJob]
  );

  const isSaved = useCallback(
    (jobId: string) => {
      return savedJobs.some((item) => item.jobId === jobId);
    },
    [savedJobs]
  );

  return {
    savedJobs,
    isLoaded,
    saveJob,
    removeJob,
    toggleSave,
    isSaved,
  };
}
