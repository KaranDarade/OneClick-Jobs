"use client";

import { useSyncExternalStore, useCallback, useState, useEffect } from "react";
import { Job, SavedJob } from "@/types/job";

const STORAGE_KEY = "oneclick_saved_jobs_v1";
const SYNC_EVENT_NAME = "oneclick_saved_jobs_updated";

// In-memory cache to maintain stable object identity and prevent infinite renders
let memoryCache: SavedJob[] = [];
let memoryCacheRaw: string | null = null;

function getSnapshot(): SavedJob[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === memoryCacheRaw) {
      return memoryCache;
    }
    memoryCacheRaw = raw;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        memoryCache = parsed;
        return memoryCache;
      }
    }
    memoryCache = [];
    return memoryCache;
  } catch {
    return memoryCache;
  }
}

function getServerSnapshot(): SavedJob[] {
  return [];
}

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};

  window.addEventListener("storage", callback);
  window.addEventListener(SYNC_EVENT_NAME, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(SYNC_EVENT_NAME, callback);
  };
}

function emitChange() {
  if (typeof window !== "undefined") {
    // Schedule in microtask to guarantee it never fires synchronously during a React render phase
    queueMicrotask(() => {
      window.dispatchEvent(new Event(SYNC_EVENT_NAME));
    });
  }
}

export function useSavedJobs() {
  const savedJobs = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const saveJob = useCallback((jobInput: Job | string) => {
    if (typeof window === "undefined") return;

    const id = typeof jobInput === "string" ? jobInput : jobInput.id;
    const fullJob = typeof jobInput === "object" ? jobInput : undefined;

    const current = getSnapshot();
    const existingIndex = current.findIndex((item) => item.jobId === id);
    let updated: SavedJob[];

    if (existingIndex >= 0) {
      if (fullJob && !current[existingIndex].job) {
        updated = [...current];
        updated[existingIndex] = {
          ...updated[existingIndex],
          job: fullJob,
        };
      } else {
        return;
      }
    } else {
      updated = [
        ...current,
        {
          jobId: id,
          savedAt: new Date().toISOString(),
          job: fullJob,
        },
      ];
    }

    try {
      const serialized = JSON.stringify(updated);
      localStorage.setItem(STORAGE_KEY, serialized);
      memoryCacheRaw = serialized;
      memoryCache = updated;
      emitChange();
    } catch (err) {
      console.error("Failed to save job to localStorage", err);
    }
  }, []);

  const removeJob = useCallback((jobId: string) => {
    if (typeof window === "undefined") return;

    const current = getSnapshot();
    const updated = current.filter((item) => item.jobId !== jobId);

    try {
      const serialized = JSON.stringify(updated);
      localStorage.setItem(STORAGE_KEY, serialized);
      memoryCacheRaw = serialized;
      memoryCache = updated;
      emitChange();
    } catch (err) {
      console.error("Failed to remove job from localStorage", err);
    }
  }, []);

  const toggleSave = useCallback(
    (jobInput: Job | string) => {
      const id = typeof jobInput === "string" ? jobInput : jobInput.id;
      const current = getSnapshot();
      if (current.some((j) => j.jobId === id)) {
        removeJob(id);
      } else {
        saveJob(jobInput);
      }
    },
    [removeJob, saveJob]
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
