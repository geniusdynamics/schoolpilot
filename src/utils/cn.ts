// ABOUTME: Utility function for combining CSS classes with conditional logic
// ABOUTME: Uses clsx for conditional classes and tailwind-merge for Tailwind CSS class merging

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines CSS classes with conditional logic and merges Tailwind CSS classes
 * @param inputs - Class values to combine
 * @returns Merged class string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}