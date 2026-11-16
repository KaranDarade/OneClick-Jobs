"use client";

import {
  SearchFilters,
  WorkArrangement,
  ExperienceLevel,
  EmploymentType,
  PostingAge,
  RoleCategory,
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

  const handleRoleCategoryToggle = (role: RoleCategory) => {
    const current = filters.roleCategories || [];
    onFilterChange({
      ...filters,
      roleCategories: toggleArrayItem(current, role),
    });
  };

  const isFiltered =
    filters.query !== "" ||
    filters.location !== "All India" ||
    Boolean(filters.isFresherOnly) ||
    (filters.roleCategories && filters.roleCategories.length > 0) ||
    filters.workArrangements.length > 0 ||
    filters.experienceLevels.length > 0 ||
    filters.employmentTypes.length > 0 ||
    filters.postingAge !== null;

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5 space-y-5 shadow-xs">
      <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-600">
          Target Filters
        </h2>
        {isFiltered && (
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset All</span>
          </button>
        )}
      </div>

      {/* Quick Experience Mode Switcher */}
      <div className="space-y-2 pb-1">
        <span className="text-xs font-bold text-neutral-800 flex items-center justify-between">
          <span>Target Experience</span>
          {filters.isFresherOnly && (
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              ACTIVE
            </span>
          )}
        </span>
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-neutral-100 rounded-xl">
          <button
            type="button"
            onClick={() => onFilterChange({ ...filters, isFresherOnly: false })}
            className={`py-2 px-2.5 rounded-lg text-xs font-semibold text-center transition-all ${
              !filters.isFresherOnly
                ? "bg-white text-neutral-900 shadow-xs font-bold"
                : "text-neutral-500 hover:text-neutral-900"
            }`}
          >
            All Tech Roles
          </button>
          <button
            type="button"
            onClick={() => onFilterChange({ ...filters, isFresherOnly: true })}
            className={`py-2 px-2.5 rounded-lg text-xs font-semibold text-center transition-all ${
              filters.isFresherOnly
                ? "bg-emerald-600 text-white shadow-xs font-bold"
                : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            🌱 Fresher (0-1 yrs)
          </button>
        </div>
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

      {/* Role / Tech Domain Filter */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-neutral-800 flex items-center justify-between">
          <span>Tech Discipline</span>
          {(filters.roleCategories?.length || 0) > 0 && (
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
              {filters.roleCategories?.length} selected
            </span>
          )}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              "Frontend",
              "Backend",
              "Full Stack",
              "Mobile",
              "DevOps & Cloud",
              "Data & AI",
              "QA & Testing",
              "Product & Design",
            ] as RoleCategory[]
          ).map((role) => {
            const isSelected = (filters.roleCategories || []).includes(role);
            return (
              <button
                key={role}
                type="button"
                onClick={() => handleRoleCategoryToggle(role)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold border transition-all ${
                  isSelected
                    ? "bg-blue-600 text-white border-blue-600 shadow-2xs font-bold ring-2 ring-blue-100"
                    : "bg-white text-neutral-700 border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
                }`}
              >
                {role}
              </button>
            );
          })}
        </div>
      </div>

      {/* Work Arrangement */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-neutral-800">
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
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold capitalize border transition-all ${
                  isSelected
                    ? "bg-neutral-900 text-white border-neutral-900 shadow-2xs font-bold ring-2 ring-neutral-200"
                    : "bg-white text-neutral-700 border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
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
        <span className="text-xs font-bold text-neutral-800">
          Seniority Tier
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
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold capitalize border transition-all ${
                    isSelected
                      ? "bg-neutral-900 text-white border-neutral-900 shadow-2xs font-bold ring-2 ring-neutral-200"
                      : "bg-white text-neutral-700 border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
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
        <span className="text-xs font-bold text-neutral-800">
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
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold capitalize border transition-all ${
                    isSelected
                      ? "bg-neutral-900 text-white border-neutral-900 shadow-2xs font-bold ring-2 ring-neutral-200"
                      : "bg-white text-neutral-700 border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
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
        <span className="text-xs font-bold text-neutral-800">
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
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold border transition-all ${
                  isSelected
                    ? "bg-neutral-900 text-white border-neutral-900 shadow-2xs font-bold ring-2 ring-neutral-200"
                    : "bg-white text-neutral-700 border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
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
