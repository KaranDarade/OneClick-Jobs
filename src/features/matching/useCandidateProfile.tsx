"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useMemo } from "react";
import { CandidateProfile, CompatibilityScoreResult } from "@/types/matching";
import { calculateJobCompatibility } from "@/server/matching/scoring";
import { Job } from "@/types/job";

interface CandidateProfileContextType {
  profile: CandidateProfile | null;
  setProfile: (profile: CandidateProfile | null) => void;
  clearProfile: () => void;
  addUserSkill: (skill: string) => void;
  removeUserSkill: (skill: string) => void;
  setPreferredArrangements: (arrangements: ("remote" | "hybrid" | "on-site")[]) => void;
  getJobScore: (job: Job) => CompatibilityScoreResult | null;
  hasProfile: boolean;
}

const STORAGE_KEY = "oneclick_candidate_profile_v1";

const CandidateProfileContext = createContext<CandidateProfileContextType | undefined>(undefined);

export function CandidateProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<CandidateProfile | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from sessionStorage on mount (session-only, transient)
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setProfileState(parsed);
      }
    } catch {
      // Ignore storage errors
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const setProfile = (newProfile: CandidateProfile | null) => {
    setProfileState(newProfile);
    try {
      if (newProfile) {
        // Store only the sanitized profile without any raw text or PII
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(newProfile));
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Storage error
    }
  };

  const clearProfile = () => {
    setProfile(null);
  };

  const addUserSkill = (skill: string) => {
    if (!profile) return;
    const trimmed = skill.trim();
    if (!trimmed) return;

    const currentSkills = profile.userSkills || profile.extractedSkills || [];
    if (!currentSkills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      const updated = {
        ...profile,
        userSkills: [...currentSkills, trimmed].sort(),
      };
      setProfile(updated);
    }
  };

  const removeUserSkill = (skill: string) => {
    if (!profile) return;
    const currentSkills = profile.userSkills || profile.extractedSkills || [];
    const updated = {
      ...profile,
      userSkills: currentSkills.filter((s) => s.toLowerCase() !== skill.toLowerCase()),
    };
    setProfile(updated);
  };

  const setPreferredArrangements = (arrangements: ("remote" | "hybrid" | "on-site")[]) => {
    if (!profile) return;
    const updated = {
      ...profile,
      preferredArrangements: arrangements,
    };
    setProfile(updated);
  };

  const getJobScore = (job: Job): CompatibilityScoreResult | null => {
    if (!profile) return null;
    return calculateJobCompatibility(profile, job);
  };

  return (
    <CandidateProfileContext.Provider
      value={{
        profile,
        setProfile,
        clearProfile,
        addUserSkill,
        removeUserSkill,
        setPreferredArrangements,
        getJobScore,
        hasProfile: Boolean(profile),
      }}
    >
      {children}
    </CandidateProfileContext.Provider>
  );
}

export function useCandidateProfile() {
  const context = useContext(CandidateProfileContext);
  if (!context) {
    throw new Error("useCandidateProfile must be used within a CandidateProfileProvider");
  }
  return context;
}
