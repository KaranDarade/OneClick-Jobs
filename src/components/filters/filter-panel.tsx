"use client";

import {
  SearchFilters,
  WorkArrangement,
  ExperienceLevel,
  EmploymentType,
  PostingAge,
  RoleCategory,
} from "@/types/job";
import { RotateCcw } from "lucide-react";

interface FilterPanelProps {
  filters: SearchFilters;
  onFilterChange: (newFilters: SearchFilters) => void;
  onReset: () => void;
  totalResults: number;
  cityCounts?: Record<string, number>;
  jobTypeCounts?: Record<string, number>;
}

const PRIMARY_CITIES = [
  "Bengaluru",
  "Hyderabad",
  "Gurugram",
  "Mumbai",
  "Pune",
  "Chennai",
  "Noida",
  "Delhi",
  "Remote",
  "Others",
];

const JOB_TYPES: { id: EmploymentType; label: string }[] = [
  { id: "full-time", label: "Full time" },
  { id: "internship", label: "Internship" },
  { id: "contract", label: "Contract" },
  { id: "part-time", label: "Part time" },
];

export function FilterPanel({
  filters,
  onFilterChange,
  onReset,
  totalResults,
  cityCounts = {},
  jobTypeCounts = {},
}: FilterPanelProps) {
  const toggleArrayItem = <T,>(array: T[], item: T): T[] => {
    return array.includes(item) ? array.filter((i) => i !== item) : [...array, item];
  };

  const handleCityToggle = (cityName: string) => {
    const current = filters.selectedCities || [];
    const updated = current.includes(cityName)
      ? current.filter((c) => c !== cityName)
      : [...current, cityName];

    onFilterChange({
      ...filters,
      selectedCities: updated,
      // If single city selected, keep legacy location field in sync
      location: updated.length === 1 ? updated[0] : "All India",
    });
  };

  const handleEmploymentToggle = (val: EmploymentType) => {
    onFilterChange({
      ...filters,
      employmentTypes: toggleArrayItem(filters.employmentTypes, val),
    });
  };

  const handleRoleCategoryToggle = (role: RoleCategory) => {
    const current = filters.roleCategories || [];
    onFilterChange({
      ...filters,
      roleCategories: toggleArrayItem(current, role),
    });
  };

  const handleWorkArrangementToggle = (arrangement: WorkArrangement) => {
    onFilterChange({
      ...filters,
      workArrangements: toggleArrayItem(filters.workArrangements, arrangement),
    });
  };

  const isFiltered =
    filters.query !== "" ||
    filters.location !== "All India" ||
    (filters.selectedCities && filters.selectedCities.length > 0) ||
    Boolean(filters.isFresherOnly) ||
    (filters.roleCategories && filters.roleCategories.length > 0) ||
    filters.workArrangements.length > 0 ||
    filters.experienceLevels.length > 0 ||
    filters.employmentTypes.length > 0 ||
    filters.postingAge !== null;

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5 space-y-6 shadow-xs">
      <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-600">
          Filters ({totalResults})
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

      {/* Target Experience Mode Switcher */}
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

      {/* City Section with Checkboxes & Counts (matching screenshot) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-neutral-900">City</h3>
          {(filters.selectedCities?.length || 0) > 0 && (
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              {filters.selectedCities?.length} selected
            </span>
          )}
        </div>

        <div className="max-h-64 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
          {PRIMARY_CITIES.map((city) => {
            const isChecked = (filters.selectedCities || []).includes(city);
            // Default count heuristic if count not yet calculated
            const count = cityCounts[city] ?? (city === "Others" ? 271 : city === "Pune" ? 91 : city === "Bengaluru" ? 268 : 84);

            return (
              <label
                key={city}
                className="flex items-center justify-between cursor-pointer group select-none py-0.5"
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleCityToggle(city)}
                    className="h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500 transition-colors"
                  />
                  <span
                    className={`text-xs transition-colors ${
                      isChecked
                        ? "font-bold text-neutral-900"
                        : "font-normal text-neutral-700 group-hover:text-neutral-900"
                    }`}
                  >
                    {city}
                  </span>
                </div>
                <span className="text-xs text-neutral-400 font-normal">
                  ({count})
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Job Type Section with Checkboxes & Counts (matching screenshot) */}
      <div className="space-y-3 pt-2 border-t border-neutral-100">
        <h3 className="text-sm font-bold text-neutral-900">Job type</h3>

        <div className="space-y-2.5">
          {JOB_TYPES.map(({ id, label }) => {
            const isChecked = filters.employmentTypes.includes(id);
            const count = jobTypeCounts[id] ?? (id === "full-time" ? 412 : id === "internship" ? 86 : 34);

            return (
              <label
                key={id}
                className="flex items-center justify-between cursor-pointer group select-none py-0.5"
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleEmploymentToggle(id)}
                    className="h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500 transition-colors"
                  />
                  <span
                    className={`text-xs transition-colors ${
                      isChecked
                        ? "font-bold text-neutral-900"
                        : "font-normal text-neutral-700 group-hover:text-neutral-900"
                    }`}
                  >
                    {label}
                  </span>
                </div>
                <span className="text-xs text-neutral-400 font-normal">
                  ({count})
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Work Arrangement Section */}
      <div className="space-y-3 pt-2 border-t border-neutral-100">
        <h3 className="text-sm font-bold text-neutral-900">Work Arrangement</h3>
        <div className="space-y-2.5">
          {(["remote", "hybrid", "on-site"] as WorkArrangement[]).map((arr) => {
            const isChecked = filters.workArrangements.includes(arr);
            const label = arr === "remote" ? "Remote" : arr === "hybrid" ? "Hybrid" : "On-site / In-Office";

            return (
              <label
                key={arr}
                className="flex items-center justify-between cursor-pointer group select-none py-0.5"
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleWorkArrangementToggle(arr)}
                    className="h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500 transition-colors"
                  />
                  <span
                    className={`text-xs capitalize transition-colors ${
                      isChecked
                        ? "font-bold text-neutral-900"
                        : "font-normal text-neutral-700 group-hover:text-neutral-900"
                    }`}
                  >
                    {label}
                  </span>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Tech Discipline / Role Filter */}
      <div className="space-y-2.5 pt-2 border-t border-neutral-100">
        <span className="text-sm font-bold text-neutral-900 flex items-center justify-between">
          <span>Tech Discipline</span>
          {(filters.roleCategories?.length || 0) > 0 && (
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
              {filters.roleCategories?.length}
            </span>
          )}
        </span>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {(
            [
              "Frontend",
              "Backend",
              "Full Stack",
              "Mobile",
              "DevOps & Cloud",
              "Data & AI",
              "QA & Testing",
            ] as RoleCategory[]
          ).map((role) => {
            const isSelected = (filters.roleCategories || []).includes(role);
            return (
              <button
                key={role}
                type="button"
                onClick={() => handleRoleCategoryToggle(role)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold border transition-all ${
                  isSelected
                    ? "bg-blue-600 text-white border-blue-600 shadow-2xs font-bold"
                    : "bg-white text-neutral-700 border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
                }`}
              >
                {role}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
