"use client";

import {
  SearchFilters,
  WorkArrangement,
  ExperienceLevel,
  EmploymentType,
  PostingAge,
} from "@/types/job";
import { POPULAR_INDIAN_CITIES } from "@/features/job-search/fixtures";
import { RotateCcw } from "lucide-react";

interface FilterPanelProps {
  filters: SearchFilters;
  onFilterChange: (newFilters: SearchFilters) => void;
  onReset: () => void;
  totalResults: number;
}

export function FilterPanel({
  filters,
  onFilterChange,
  onReset,
  totalResults,
}: FilterPanelProps) {
  const toggleArrayItem = <T,>(array: T[], item: T): T[] => {
    return array.includes(item) ? array.filter((i) => i !== item) : [...array, item];
  };

  const handleArrangementToggle = (val: WorkArrangement) => {
    onFilterChange({
      ...filters,
      workArrangements: toggleArrayItem(filters.workArrangements, val),
    });
  };

  const handleExperienceToggle = (val: ExperienceLevel) => {
    onFilterChange({
      ...filters,
      experienceLevels: toggleArrayItem(filters.experienceLevels, val),
    });
  };

  const handleEmploymentToggle = (val: EmploymentType) => {
    onFilterChange({
      ...filters,
      employmentTypes: toggleArrayItem(filters.employmentTypes, val),
    });
  };

  const handlePostingAgeChange = (age: PostingAge | null) => {
    onFilterChange({
      ...filters,
      postingAge: age,
    });
  };

  const handleLocationChange = (loc: string) => {
    onFilterChange({
      ...filters,
      location: loc,
    });
  };

  const isFiltered =
    filters.query !== "" ||
    filters.location !== "All India" ||
    filters.workArrangements.length > 0 ||
    filters.experienceLevels.length > 0 ||
    filters.employmentTypes.length > 0 ||
    filters.postingAge !== null;

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 space-y-5">
      <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
          Target Filters
        </h2>
        {isFiltered && (
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1 text-[11px] font-medium text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Location Filter */}
      <div className="space-y-1.5">
        <label htmlFor="filter-location" className="text-xs font-semibold text-neutral-700">
          City / Hub
        </label>
        <select
          id="filter-location"
          value={filters.location}
          onChange={(e) => handleLocationChange(e.target.value)}
          className="w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs text-neutral-800 focus:outline-none focus:border-neutral-400"
        >
          {POPULAR_INDIAN_CITIES.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
          <option value="Delhi NCR">Delhi NCR</option>
        </select>
      </div>

      {/* Work Arrangement (JevJobs Pill Filters) */}
      <div className="space-y-2">
        <span className="text-xs font-semibold text-neutral-700">
          Work Arrangement
        </span>
        <div className="flex flex-wrap gap-1.5">
          {(["remote", "hybrid", "on-site"] as WorkArrangement[]).map((arr) => {
            const isSelected = filters.workArrangements.includes(arr);
            return (
              <button
                key={arr}
                type="button"
                onClick={() => handleArrangementToggle(arr)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                  isSelected
                    ? "bg-neutral-900 text-white"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                {arr}
              </button>
            );
          })}
        </div>
      </div>

      {/* Experience Level */}
      <div className="space-y-2">
        <span className="text-xs font-semibold text-neutral-700">
          Experience Level
        </span>
        <div className="flex flex-wrap gap-1.5">
          {(["internship", "fresher", "mid", "senior", "lead"] as ExperienceLevel[]).map(
            (exp) => {
              const isSelected = filters.experienceLevels.includes(exp);
              return (
                <button
                  key={exp}
                  type="button"
                  onClick={() => handleExperienceToggle(exp)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                    isSelected
                      ? "bg-neutral-900 text-white"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  }`}
                >
                  {exp}
                </button>
              );
            }
          )}
        </div>
      </div>

      {/* Employment Type */}
      <div className="space-y-2">
        <span className="text-xs font-semibold text-neutral-700">
          Employment Type
        </span>
        <div className="flex flex-wrap gap-1.5">
          {(["full-time", "part-time", "contract", "internship"] as EmploymentType[]).map(
            (emp) => {
              const isSelected = filters.employmentTypes.includes(emp);
              return (
                <button
                  key={emp}
                  type="button"
                  onClick={() => handleEmploymentToggle(emp)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                    isSelected
                      ? "bg-neutral-900 text-white"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  }`}
                >
                  {emp}
                </button>
              );
            }
          )}
        </div>
      </div>

      {/* Posting Age */}
      <div className="space-y-2">
        <span className="text-xs font-semibold text-neutral-700">
          Date Posted
        </span>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { label: "Anytime", val: null },
              { label: "Past 24h", val: "1" },
              { label: "Past 7d", val: "7" },
              { label: "Past 14d", val: "14" },
              { label: "Past 30d", val: "30" },
            ] as { label: string; val: PostingAge | null }[]
          ).map((item) => {
            const isSelected = filters.postingAge === item.val;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => handlePostingAgeChange(item.val)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  isSelected
                    ? "bg-neutral-900 text-white"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
