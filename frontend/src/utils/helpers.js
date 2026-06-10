/**
 * HR Pro — Utility helpers for the frontend.
 */

import { format, parseISO, isValid } from "date-fns";

/**
 * Format a number as Ghana Cedis currency.
 * @param {number|string} value
 * @param {boolean} showSymbol - Include "GHS" prefix
 */
export function formatCurrency(value, showSymbol = true) {
  const num = Number(value);
  if (isNaN(num)) return "—";
  const formatted = num.toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return showSymbol ? `GHS ${formatted}` : formatted;
}

/**
 * Format a date string to a readable format.
 * @param {string} dateStr - ISO date string
 * @param {string} fmt - date-fns format string
 */
export function formatDate(dateStr, fmt = "dd MMM yyyy") {
  if (!dateStr) return "—";
  try {
    const date = typeof dateStr === "string" ? parseISO(dateStr) : dateStr;
    if (!isValid(date)) return "—";
    return format(date, fmt);
  } catch {
    return "—";
  }
}

/**
 * Get initials from a full name.
 * @param {string} name
 */
export function getInitials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");
}

/**
 * Truncate a string to a max length.
 * @param {string} str
 * @param {number} maxLength
 */
export function truncate(str, maxLength = 50) {
  if (!str) return "";
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + "…";
}

/**
 * Convert snake_case or UPPER_CASE to Title Case.
 * @param {string} str
 */
export function toTitleCase(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Get the current Ghana fiscal year.
 * Ghana's fiscal year runs January to December.
 */
export function getCurrentFiscalYear() {
  return new Date().getFullYear();
}

/**
 * Calculate age from date of birth.
 * @param {string} dob - Date of birth (ISO string or YYYY-MM-DD)
 */
export function calculateAge(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/**
 * Extract error message from an Axios error response.
 * @param {Error} error - Axios error
 * @param {string} fallback - Default message
 */
export function getErrorMessage(error, fallback = "An error occurred.") {
  if (!error.response) return fallback;
  const data = error.response.data;
  if (typeof data === "string") return data;
  if (data?.detail) return data.detail;
  if (data?.non_field_errors) return data.non_field_errors[0];
  if (typeof data === "object") {
    const firstKey = Object.keys(data)[0];
    if (firstKey) {
      const val = data[firstKey];
      return `${firstKey}: ${Array.isArray(val) ? val[0] : val}`;
    }
  }
  return fallback;
}

/**
 * Build a query string from an object, omitting null/undefined/empty values.
 * @param {object} params
 */
export function buildQueryString(params) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") {
      qs.set(key, String(value));
    }
  });
  return qs.toString();
}

/**
 * Ghana PAYE tax bands for display purposes.
 */
export const GHANA_PAYE_BANDS = [
  { range: "First GHS 4,380", rate: "0%" },
  { range: "Next GHS 1,320", rate: "5%" },
  { range: "Next GHS 1,560", rate: "10%" },
  { range: "Next GHS 38,000", rate: "17.5%" },
  { range: "Next GHS 192,000", rate: "25%" },
  { range: "Above GHS 240,000", rate: "30%" },
];

/**
 * SSNIT contribution rates for display.
 */
export const SSNIT_RATES = {
  employee: "5.5%",
  employer: "13%",
  tier2_employer: "5%",
};
