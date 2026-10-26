"use client";

import { useState } from "react";
import { SearchFilters, SortOption } from "@/types/job";
import { Search, MapPin, SlidersHorizontal, X } from "lucide-react";
import { POPULAR_INDIAN_CITIES } from "@/features/job-search/fixtures";

interface SearchControlsProps {
  filters: SearchFilters;
  onFilterChange: (filters: SearchFilters) => void;
  onToggleMobileFilters: () => void;
  totalResults: number;
}

export function SearchControls({
  filters,
  onFilterChange,
  onToggleMobileFilters,
  totalResults,
}: SearchControlsProps) {
  const [searchInput, setSearchInput] = useState(filters.query);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange({
      ...filters,
      query: searchInput,
    });
  };

  const handleClearQuery = () => {
    setSearchInput("");
    onFilterChange({
      ...filters,
      query: "",
    });
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({
      ...filters,
      sortBy: e.target.value as SortOption,
    });
  };

  const handleLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({
      ...filters,
      location: e.target.value,
    });
  };

  return (
    <div className="space-y-3">
      {/* Search Bar matching JevJobs input style */}
      <form
        onSubmit={handleSearchSubmit}
        className="flex flex-col sm:flex-row items-center gap-2 rounded-2xl border border-neutral-200 bg-white p-1.5 shadow-2xs focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100"
      >
        {/* Role/Keywords Input */}
        <div className="relative flex-1 w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search role, skills (e.g. Next.js, Python), or company..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full rounded-lg py-2 pl-9 pr-8 text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none bg-transparent"
          />
          {searchInput && (
            <button
              type="button"
              onClick={handleClearQuery}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              aria-label="Clear search input"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Quick Location Dropdown inside bar */}
        <div className="relative border-t sm:border-t-0 sm:border-l border-neutral-200 pt-2 sm:pt-0 sm:pl-2 w-full sm:w-auto">
          <div className="flex items-center">
            <MapPin className="pointer-events-none absolute left-3 sm:left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
            <select
              value={filters.location}
              onChange={handleLocationChange}
              aria-label="Filter jobs by Indian city"
              className="w-full sm:w-44 rounded-lg bg-transparent py-2 pl-8 sm:pl-9 pr-6 text-xs sm:text-sm text-neutral-700 focus:outline-none cursor-pointer"
            >
              {POPULAR_INDIAN_CITIES.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
              <option value="Delhi NCR">Delhi NCR</option>
            </select>
          </div>
        </div>

        {/* Search Submit Button */}
        <button
          type="submit"
          className="w-full sm:w-auto inline-flex items-center justify-center rounded-full bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 transition-colors shrink-0"
        >
          Search
        </button>
      </form>

      {/* Results header & sort controls */}
      <div className="flex items-center justify-between text-xs text-neutral-500 pt-1">
        <div className="flex items-center gap-2">
          <span>
            Showing <strong className="font-semibold text-neutral-900">{totalResults}</strong> {totalResults === 1 ? "match" : "matches"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Mobile Filter Drawer Trigger */}
          <button
            type="button"
            onClick={onToggleMobileFilters}
            className="sm:hidden inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
          >
            <SlidersHorizontal className="h-3 w-3 text-neutral-500" />
            <span>Filters</span>
          </button>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="hidden sm:inline text-neutral-400">Sort by:</span>
            <select
              value={filters.sortBy}
              onChange={handleSortChange}
              aria-label="Sort jobs"
              className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1 text-xs text-neutral-700 focus:outline-none focus:border-neutral-400"
            >
              <option value="relevance">Relevance</option>
              <option value="date_desc">Newest First</option>
              <option value="salary_desc">Highest Salary</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
