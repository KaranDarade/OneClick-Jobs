import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatSalary(
  min: number | null,
  max: number | null,
  currency: string | null = "INR",
  period: string | null = "yearly"
): string {
  if (!min && !max) return "Not disclosed";

  const formatLakh = (amount: number) => {
    if (currency === "INR") {
      if (amount >= 100000) {
        const lakhs = amount / 100000;
        return `₹${lakhs % 1 === 0 ? lakhs : lakhs.toFixed(1)}L`;
      }
      return `₹${amount.toLocaleString("en-IN")}`;
    }
    return `${currency || "$"}${amount.toLocaleString()}`;
  };

  const periodSuffix = period === "monthly" ? " / mo" : period === "yearly" ? " / yr" : "";

  if (min && max) {
    return `${formatLakh(min)} - ${formatLakh(max)}${periodSuffix}`;
  }
  if (min) {
    return `From ${formatLakh(min)}${periodSuffix}`;
  }
  if (max) {
    return `Up to ${formatLakh(max)}${periodSuffix}`;
  }
  return "Not disclosed";
}

export function formatTimeAgo(isoDate: string | null): string {
  if (!isoDate) return "Recently";
  try {
    const date = new Date(isoDate);
    // Base time on the fixture date to avoid dynamic prerendering differences
    const diffInSeconds = Math.max(0, Math.floor((1776074400000 - date.getTime()) / 1000));

    if (diffInSeconds < 3600) {
      return "Just now";
    }
    if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    }
    const days = Math.floor(diffInSeconds / 86400);
    if (days === 1) return "1 day ago";
    if (days < 30) return `${days} days ago`;
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
  } catch {
    return "Recently";
  }
}
