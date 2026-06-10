/**
 * All API endpoint constants.
 * Import from here rather than hardcoding URLs in components.
 */

export const AUTH = {
  LOGIN: "/auth/login/",
  LOGOUT: "/auth/logout/",
  REFRESH: "/auth/token/refresh/",
  PROFILE: "/auth/profile/",
  CHANGE_PASSWORD: "/auth/change-password/",
  REGISTER: "/auth/register/",
  USERS: "/auth/users/",
  USER: (id) => `/auth/users/${id}/`,
  APPROVE_USER: (id) => `/auth/users/${id}/approve/`,
  PENDING_APPROVALS: "/auth/pending-approvals/",
  PASSWORD_RESET_REQUEST: "/auth/password-reset-requests/",
  PASSWORD_RESET_LIST: "/auth/password-reset-requests/list/",
  PASSWORD_RESET_RESOLVE: (id) => `/auth/password-reset-requests/${id}/resolve/`,
};

export const EMPLOYEES = {
  LIST: "/employees/",
  DETAIL: (id) => `/employees/${id}/`,
  ME: "/employees/me/",
  IMPORT: "/employees/import/",
  IMPORT_TEMPLATE: "/employees/import-template/",
};

export const DEPARTMENTS = {
  LIST: "/departments/",
  DETAIL: (id) => `/departments/${id}/`,
  POSITIONS: "/departments/positions/",
  POSITION: (id) => `/departments/positions/${id}/`,
};

export const SALARY = {
  STRUCTURES: "/salary/structures/",
  STRUCTURE: (id) => `/salary/structures/${id}/`,
  ALLOWANCE_TYPES: "/salary/allowance-types/",
  ALLOWANCE_TYPE: (id) => `/salary/allowance-types/${id}/`,
  ALLOWANCES: "/salary/allowances/",
  ALLOWANCE: (id) => `/salary/allowances/${id}/`,
  OVERTIME_RATES: "/salary/overtime-rates/",
  OVERTIME_RATE: (id) => `/salary/overtime-rates/${id}/`,
  PAYE_BANDS: "/salary/paye-bands/",
  PAYE_BAND: (id) => `/salary/paye-bands/${id}/`,
  PAYROLL_SETTINGS: "/salary/payroll-settings/",
  BUSINESS_PROFILE: "/salary/business-profile/",
};

export const ATTENDANCE = {
  LIST: "/attendance/",
  DETAIL: (id) => `/attendance/${id}/`,
  SUMMARY: "/attendance/summary/",
  IMPORT: "/attendance/import/",
};

export const LEAVE = {
  TYPES: "/leave/types/",
  TYPE: (id) => `/leave/types/${id}/`,
  BALANCES: "/leave/balances/",
  REQUESTS: "/leave/requests/",
  REQUEST: (id) => `/leave/requests/${id}/`,
  ACTION: (id) => `/leave/requests/${id}/action/`,
};

export const LOANS = {
  LIST: "/loans/",
  DETAIL: (id) => `/loans/${id}/`,
  ACTION: (id) => `/loans/${id}/action/`,
  REPAYMENTS: "/loans/repayments/",
};

export const PAYROLL = {
  RUNS: "/payroll/runs/",
  RUN: (id) => `/payroll/runs/${id}/`,
  PROCESS: (id) => `/payroll/runs/${id}/process/`,
  FINALIZE: (id) => `/payroll/runs/${id}/finalize/`,
  SEND_PAYSLIPS: (id) => `/payroll/runs/${id}/send-payslips/`,
  CANCEL: (id) => `/payroll/runs/${id}/cancel/`,
  REOPEN: (id) => `/payroll/runs/${id}/reopen/`,
  ADJUSTMENTS: (id) => `/payroll/runs/${id}/adjustments/`,
  ADJUSTMENT: (runId, id) => `/payroll/runs/${runId}/adjustments/${id}/`,
  ELIGIBLE_EMPLOYEES: (id) => `/payroll/runs/${id}/eligible-employees/`,
  PAYSLIPS: "/payroll/payslips/",
  PAYSLIP: (id) => `/payroll/payslips/${id}/`,
  PAYSLIP_SEND: (id) => `/payroll/payslips/${id}/send/`,
  PAYSLIP_PDF: (id) => `/payroll/payslips/${id}/pdf/`,
  TRENDS: "/payroll/trends/",
};

export const REPORTS = {
  GRA: "/reports/gra/",
  SSNIT: "/reports/ssnit/",
  PAYROLL_SUMMARY: "/reports/payroll-summary/",
  HEADCOUNT: "/reports/headcount/",
  BANK_SCHEDULE: "/reports/bank-schedule/",
};

export const PERFORMANCE = {
  CYCLES: "/performance/cycles/",
  CYCLE: (id) => `/performance/cycles/${id}/`,
  REVIEWS: "/performance/reviews/",
  REVIEW: (id) => `/performance/reviews/${id}/`,
  REVIEW_ACTION: (id) => `/performance/reviews/${id}/action/`,
  KPIS: "/performance/kpis/",
  KPI: (id) => `/performance/kpis/${id}/`,
  COMMENTS: "/performance/comments/",
  DASHBOARD: "/performance/dashboard/",
};
