import React from "react";

const VARIANTS = {
  // Status
  ACTIVE: "bg-green-100 text-green-700",
  INACTIVE: "bg-slate-100 text-slate-600",
  TERMINATED: "bg-red-100 text-red-700",
  SUSPENDED: "bg-orange-100 text-orange-700",
  ON_LEAVE: "bg-blue-100 text-blue-700",

  // Leave / Loan status
  PENDING: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-green-100 text-green-700",
  MANAGER_APPROVED: "bg-blue-100 text-blue-700",
  HR_AUTHORIZED: "bg-indigo-100 text-indigo-700",
  MD_AUTHORIZED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  CANCELLED: "bg-slate-100 text-slate-600",

  // Payroll status
  DRAFT: "bg-slate-100 text-slate-600",
  PROCESSING: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  FINAL: "bg-primary-100 text-primary-700",

  // Attendance
  PRESENT: "bg-green-100 text-green-700",
  ABSENT: "bg-red-100 text-red-700",
  LATE: "bg-orange-100 text-orange-700",
  HALF_DAY: "bg-yellow-100 text-yellow-700",

  // Performance review workflow
  SELF_REVIEW: "bg-blue-100 text-blue-700",
  MANAGER_REVIEW: "bg-purple-100 text-purple-700",
  HR_REVIEW: "bg-orange-100 text-orange-700",

  // Review cycle status
  CLOSED: "bg-slate-100 text-slate-600",

  // Generic
  success: "bg-green-100 text-green-700",
  warning: "bg-yellow-100 text-yellow-700",
  danger: "bg-red-100 text-red-700",
  info: "bg-blue-100 text-blue-700",
  default: "bg-slate-100 text-slate-600",
};

/**
 * Status badge component.
 *
 * @param {string} status - Maps to a color variant
 * @param {string} label  - Display text (defaults to status)
 */
export default function Badge({ status, label, className = "" }) {
  const colorClass = VARIANTS[status] || VARIANTS.default;
  const displayLabel = label || status?.replace(/_/g, " ");

  return (
    <span className={`badge ${colorClass} ${className}`}>
      {displayLabel}
    </span>
  );
}
