import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../../api/axios";
import { REPORTS } from "../../api/endpoints";
import Button from "../../components/common/Button";
import Table from "../../components/common/Table";
import { exportToCsv } from "../../utils/csv";
import {
  DocumentArrowDownIcon,
  ChartBarIcon,
  BuildingOfficeIcon,
  UsersIcon,
  BanknotesIcon,
} from "@heroicons/react/24/outline";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const fmt = (v) =>
  v != null
    ? `GHS ${Number(v).toLocaleString("en-GH", { minimumFractionDigits: 2 })}`
    : "—";

function ReportCard({ title, description, icon: Icon, onClick, active }) {
  return (
    <button
      onClick={onClick}
      className={`card text-left hover:shadow-card-hover transition-all ${
        active ? "ring-2 ring-primary-500 border-primary-200" : ""
      }`}
    >
      <div className="flex items-start gap-4">
        <div className={`rounded-xl p-3 ${active ? "bg-primary-600" : "bg-slate-100"}`}>
          <Icon className={`h-6 w-6 ${active ? "text-white" : "text-slate-500"}`} />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-500 mt-0.5">{description}</p>
        </div>
      </div>
    </button>
  );
}

function StatCard({ label, value, color = "text-slate-900" }) {
  return (
    <div className="card !p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}

export default function Reports() {
  const [activeReport, setActiveReport] = useState("payroll-summary");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [includeAllowances, setIncludeAllowances] = useState(false);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  // ── Payroll Summary ────────────────────────────────────────────────────────
  const { data: payrollSummary, isLoading: loadingPayroll } = useQuery({
    queryKey: ["report-payroll-summary", month, year, includeAllowances],
    queryFn: () =>
      api
        .get(`${REPORTS.PAYROLL_SUMMARY}?month=${month}&year=${year}&include_allowances=${includeAllowances}`)
        .then((r) => r.data),
    enabled: activeReport === "payroll-summary",
    retry: false,
  });

  // ── GRA ───────────────────────────────────────────────────────────────────
  const { data: graReport, isLoading: loadingGRA } = useQuery({
    queryKey: ["report-gra", month, year],
    queryFn: () =>
      api.get(`${REPORTS.GRA}?month=${month}&year=${year}`).then((r) => r.data),
    enabled: activeReport === "gra",
    retry: false,
  });

  // ── SSNIT ─────────────────────────────────────────────────────────────────
  const { data: ssnitReport, isLoading: loadingSSNIT } = useQuery({
    queryKey: ["report-ssnit", month, year],
    queryFn: () =>
      api.get(`${REPORTS.SSNIT}?month=${month}&year=${year}`).then((r) => r.data),
    enabled: activeReport === "ssnit",
    retry: false,
  });

  // ── Headcount ─────────────────────────────────────────────────────────────
  const { data: headcount } = useQuery({
    queryKey: ["report-headcount"],
    queryFn: () => api.get(REPORTS.HEADCOUNT).then((r) => r.data),
    enabled: activeReport === "headcount",
  });

  // ── Bank Schedule ─────────────────────────────────────────────────────────
  const { data: bankSchedule, isLoading: loadingBank } = useQuery({
    queryKey: ["report-bank-schedule", month, year],
    queryFn: () =>
      api.get(`${REPORTS.BANK_SCHEDULE}?month=${month}&year=${year}`).then((r) => r.data),
    enabled: activeReport === "bank-schedule",
    retry: false,
  });

  // ── Column definitions ────────────────────────────────────────────────────

  const graColumns = [
    { key: "employee_id", label: "ID" },
    { key: "full_name", label: "Name" },
    { key: "tin_number", label: "TIN" },
    { key: "department", label: "Department" },
    { key: "basic_salary", label: "Basic", render: (v) => fmt(v) },
    { key: "gross_salary", label: "Gross", render: (v) => fmt(v) },
    { key: "taxable_income", label: "Taxable", render: (v) => fmt(v) },
    {
      key: "paye_tax",
      label: "PAYE Tax",
      render: (v) => <span className="font-medium text-red-600">{fmt(v)}</span>,
    },
  ];

  const ssnitColumns = [
    { key: "employee_id", label: "ID" },
    { key: "full_name", label: "Name" },
    { key: "ssnit_number", label: "SSNIT No." },
    { key: "basic_salary", label: "Basic", render: (v) => fmt(v) },
    { key: "ssnit_employee", label: "Employee (5.5%)", render: (v) => fmt(v) },
    { key: "ssnit_employer", label: "Employer (13%)", render: (v) => fmt(v) },
    { key: "tier2_employer", label: "Tier 2 (5%)", render: (v) => fmt(v) },
    {
      key: "total_ssnit",
      label: "Total",
      render: (v) => <span className="font-medium">{fmt(v)}</span>,
    },
  ];

  const headcountColumns = [
    { key: "name", label: "Department" },
    { key: "code", label: "Code" },
    { key: "active_count", label: "Active Employees" },
  ];

  // Payroll summary — per-employee detail columns
  const payrollDetailColumns = [
    {
      key: "employee_id",
      label: "ID",
      render: (v) => <span className="font-mono text-xs text-slate-500">{v}</span>,
    },
    { key: "full_name", label: "Employee" },
    { key: "department", label: "Dept" },
    { key: "basic_salary", label: "Basic", render: (v) => fmt(v) },
    { key: "total_allowances", label: "Allowances", render: (v) => fmt(v) },
    { key: "overtime_amount", label: "Overtime", render: (v) => fmt(v) },
    {
      key: "gross_salary",
      label: "Gross",
      render: (v) => <span className="font-semibold text-slate-900">{fmt(v)}</span>,
    },
    { key: "ssnit_employee", label: "SSNIT (Emp)", render: (v) => fmt(v) },
    { key: "paye_tax", label: "PAYE", render: (v) => <span className="text-red-600">{fmt(v)}</span> },
    { key: "loan_deduction", label: "Loan Ded.", render: (v) => fmt(v) },
    { key: "other_deductions", label: "Other Ded.", render: (v) => fmt(v) },
    {
      key: "total_deductions",
      label: "Total Ded.",
      render: (v) => <span className="text-red-700 font-medium">{fmt(v)}</span>,
    },
    {
      key: "net_salary",
      label: "Net Pay",
      render: (v) => <span className="font-bold text-green-700">{fmt(v)}</span>,
    },
  ];

  // Department breakdown columns (payroll summary)
  const deptColumns = [
    { key: "department", label: "Department" },
    { key: "employee_count", label: "Employees" },
    { key: "total_basic", label: "Basic", render: (v) => fmt(v) },
    { key: "total_allowances", label: "Allowances", render: (v) => fmt(v) },
    { key: "total_overtime", label: "Overtime", render: (v) => fmt(v) },
    { key: "total_gross", label: "Gross", render: (v) => fmt(v) },
    { key: "total_paye", label: "PAYE", render: (v) => fmt(v) },
    { key: "total_loan_deductions", label: "Loans", render: (v) => fmt(v) },
    { key: "total_other_deductions", label: "Other Ded.", render: (v) => fmt(v) },
    {
      key: "total_net",
      label: "Net Pay",
      render: (v) => <span className="font-bold text-green-700">{fmt(v)}</span>,
    },
  ];

  // Allowance type summary columns
  const allowanceSummaryColumns = [
    { key: "name", label: "Allowance Type" },
    {
      key: "is_taxable",
      label: "Taxable",
      render: (v) => (
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${v ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
          {v ? "Taxable" : "Non-taxable"}
        </span>
      ),
    },
    {
      key: "total",
      label: "Total",
      render: (v) => <span className="font-medium">{fmt(v)}</span>,
    },
  ];

  // Bank schedule columns
  const bankColumns = [
    {
      key: "employee_id",
      label: "ID",
      render: (v) => <span className="font-mono text-xs text-slate-500">{v}</span>,
    },
    { key: "full_name", label: "Employee Name" },
    { key: "bank_name", label: "Bank" },
    { key: "account_number", label: "Account Number" },
    { key: "branch", label: "Branch" },
    {
      key: "net_salary",
      label: "Net Salary (GHS)",
      render: (v) => <span className="font-bold text-green-700">{fmt(v)}</span>,
    },
  ];

  const noData = (label) => (
    <div className="card text-center py-12 text-slate-400">
      No payroll run found for {MONTHS[month - 1]} {year}. {label}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Reports</h2>
        <p className="text-sm text-slate-500">
          Payroll summaries, GRA PAYE, SSNIT schedules, and bank payment schedule
        </p>
      </div>

      {/* Report type cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <ReportCard
          title="Payroll Summary"
          description="Full monthly payroll breakdown"
          icon={ChartBarIcon}
          active={activeReport === "payroll-summary"}
          onClick={() => setActiveReport("payroll-summary")}
        />
        <ReportCard
          title="GRA PAYE Report"
          description="Monthly PAYE tax filing data"
          icon={DocumentArrowDownIcon}
          active={activeReport === "gra"}
          onClick={() => setActiveReport("gra")}
        />
        <ReportCard
          title="SSNIT Schedule"
          description="Monthly SSNIT contributions"
          icon={BuildingOfficeIcon}
          active={activeReport === "ssnit"}
          onClick={() => setActiveReport("ssnit")}
        />
        <ReportCard
          title="Bank Schedule"
          description="Employee net salary payment list"
          icon={BanknotesIcon}
          active={activeReport === "bank-schedule"}
          onClick={() => setActiveReport("bank-schedule")}
        />
        <ReportCard
          title="Headcount"
          description="Employee count by department"
          icon={UsersIcon}
          active={activeReport === "headcount"}
          onClick={() => setActiveReport("headcount")}
        />
      </div>

      {/* Period selector */}
      {activeReport !== "headcount" && (
        <div className="card !p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-700">Month:</label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="form-input w-36"
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-700">Year:</label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="form-input w-28"
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Allowances toggle — only on payroll summary */}
            {activeReport === "payroll-summary" && (
              <label className="flex items-center gap-2 cursor-pointer select-none ml-auto">
                <div
                  onClick={() => setIncludeAllowances((v) => !v)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    includeAllowances ? "bg-primary-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                      includeAllowances ? "translate-x-4" : "translate-x-1"
                    }`}
                  />
                </div>
                <span className="text-sm font-medium text-slate-700">
                  Show allowance breakdown
                </span>
              </label>
            )}
          </div>
        </div>
      )}

      {/* ── Payroll Summary ────────────────────────────────────────────────── */}
      {activeReport === "payroll-summary" && (
        <div className="space-y-5">
          {loadingPayroll && <div className="card py-12 text-center text-slate-400">Loading…</div>}

          {payrollSummary && (
            <>
              {/* Grand total stat cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                <StatCard label="Employees" value={payrollSummary.total_employees} />
                <StatCard label="Total Basic" value={fmt(payrollSummary.total_basic_salary)} />
                <StatCard label="Total Allowances" value={fmt(payrollSummary.total_allowances)} />
                <StatCard label="Total Overtime" value={fmt(payrollSummary.total_overtime)} />
                <StatCard label="Gross Payroll" value={fmt(payrollSummary.total_gross_salary)} color="text-primary-700" />
                <StatCard label="Net Payroll" value={fmt(payrollSummary.total_net_salary)} color="text-green-700" />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard label="SSNIT (Employee)" value={fmt(payrollSummary.total_ssnit_employee)} />
                <StatCard label="SSNIT (Employer)" value={fmt(payrollSummary.total_ssnit_employer)} />
                <StatCard label="Total PAYE Tax" value={fmt(payrollSummary.total_paye_tax)} color="text-red-600" />
                <StatCard label="Loan Deductions" value={fmt(payrollSummary.total_loan_deductions)} />
              </div>

              {/* Allowance type summary (optional) */}
              {includeAllowances && payrollSummary.allowance_summary?.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-slate-700">
                      Allowance Type Summary
                    </h3>
                    <button
                      onClick={() => exportToCsv(payrollSummary.allowance_summary, `allowance-summary-${payrollSummary.month_name}-${payrollSummary.year}`, allowanceSummaryColumns)}
                      className="text-xs text-primary-600 hover:text-primary-800 font-medium flex items-center gap-1"
                    >
                      <DocumentArrowDownIcon className="h-3.5 w-3.5" />
                      CSV
                    </button>
                  </div>
                  <Table
                    columns={allowanceSummaryColumns}
                    data={payrollSummary.allowance_summary}
                    emptyMessage="No allowances configured."
                  />
                </div>
              )}

              {/* Department breakdown */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-slate-700">
                    Department Breakdown
                  </h3>
                  <button
                    onClick={() => exportToCsv(payrollSummary.department_breakdown, `dept-breakdown-${payrollSummary.month_name}-${payrollSummary.year}`, deptColumns)}
                    className="text-xs text-primary-600 hover:text-primary-800 font-medium flex items-center gap-1"
                  >
                    <DocumentArrowDownIcon className="h-3.5 w-3.5" />
                    CSV
                  </button>
                </div>
                <Table
                  columns={deptColumns}
                  data={payrollSummary.department_breakdown || []}
                  emptyMessage="No department data."
                />
              </div>

              {/* Per-employee detail */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-slate-700">
                    Employee Detail
                  </h3>
                  <button
                    onClick={() => exportToCsv(payrollSummary.employee_breakdown, `payroll-employees-${payrollSummary.month_name}-${payrollSummary.year}`, payrollDetailColumns)}
                    className="text-xs text-primary-600 hover:text-primary-800 font-medium flex items-center gap-1"
                  >
                    <DocumentArrowDownIcon className="h-3.5 w-3.5" />
                    CSV
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <Table
                    columns={payrollDetailColumns}
                    data={payrollSummary.employee_breakdown || []}
                    emptyMessage="No employee data."
                  />
                </div>

                {/* Per-employee allowance breakdown (when toggled) */}
                {includeAllowances && payrollSummary.employee_breakdown?.some((e) => e.allowances?.length > 0) && (
                  <div className="mt-4 space-y-3">
                    <h4 className="text-sm font-semibold text-slate-700">
                      Individual Allowance Breakdown
                    </h4>
                    {payrollSummary.employee_breakdown
                      .filter((e) => e.allowances?.length > 0)
                      .map((emp) => (
                        <div key={emp.employee_id} className="rounded-lg border border-slate-200 overflow-hidden">
                          <div className="bg-slate-50 px-4 py-2 flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-800">
                              {emp.full_name}
                            </span>
                            <span className="text-xs text-slate-500 font-mono">{emp.employee_id}</span>
                          </div>
                          <div className="divide-y divide-slate-100">
                            {emp.allowances.map((a, i) => (
                              <div key={i} className="px-4 py-2 flex items-center justify-between text-sm">
                                <span className="text-slate-700">{a.name}</span>
                                <div className="flex items-center gap-3">
                                  <span className={`text-xs px-1.5 py-0.5 rounded ${a.is_taxable ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700"}`}>
                                    {a.is_taxable ? "Taxable" : "Non-tax"}
                                  </span>
                                  <span className="font-medium text-slate-900">{fmt(a.amount)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </>
          )}

          {!payrollSummary && !loadingPayroll && noData("Process a payroll run first.")}
        </div>
      )}

      {/* ── GRA PAYE ─────────────────────────────────────────────────────── */}
      {activeReport === "gra" && (
        <div className="space-y-4">
          {graReport && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <StatCard label="Total Employees" value={graReport.total_employees} />
                <StatCard label="Total Taxable Income" value={fmt(graReport.total_taxable_income)} />
                <StatCard label="Total PAYE Tax" value={fmt(graReport.total_paye_tax)} color="text-red-600" />
              </div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-slate-700">GRA PAYE Returns — Employee Records</h3>
                <button
                  onClick={() => exportToCsv(graReport.records, `gra-paye-${graReport.month_name}-${graReport.year}`, graColumns)}
                  className="text-xs text-primary-600 hover:text-primary-800 font-medium flex items-center gap-1"
                >
                  <DocumentArrowDownIcon className="h-3.5 w-3.5" />
                  CSV
                </button>
              </div>
              <Table columns={graColumns} data={graReport.records || []} emptyMessage="No GRA data." />
            </>
          )}
          {!graReport && !loadingGRA && noData("")}
        </div>
      )}

      {/* ── SSNIT ────────────────────────────────────────────────────────── */}
      {activeReport === "ssnit" && (
        <div className="space-y-4">
          {ssnitReport && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard label="Employee Contributions" value={fmt(ssnitReport.total_ssnit_employee)} />
                <StatCard label="Employer Contributions" value={fmt(ssnitReport.total_ssnit_employer)} />
                <StatCard label="Tier 2 (Employer)" value={fmt(ssnitReport.total_tier2_employer)} />
                <StatCard label="Total SSNIT" value={fmt(ssnitReport.total_ssnit_combined)} color="text-primary-700" />
              </div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-slate-700">SSNIT Contribution Schedule</h3>
                <button
                  onClick={() => exportToCsv(ssnitReport.schedule, `ssnit-schedule-${ssnitReport.month_name}-${ssnitReport.year}`, ssnitColumns)}
                  className="text-xs text-primary-600 hover:text-primary-800 font-medium flex items-center gap-1"
                >
                  <DocumentArrowDownIcon className="h-3.5 w-3.5" />
                  CSV
                </button>
              </div>
              <Table columns={ssnitColumns} data={ssnitReport.schedule || []} emptyMessage="No SSNIT data." />
            </>
          )}
          {!ssnitReport && !loadingSSNIT && noData("")}
        </div>
      )}

      {/* ── Bank Schedule ─────────────────────────────────────────────────── */}
      {activeReport === "bank-schedule" && (
        <div className="space-y-4">
          {loadingBank && <div className="card py-12 text-center text-slate-400">Loading…</div>}

          {bankSchedule && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <StatCard label="Employees to Pay" value={bankSchedule.total_employees} />
                <StatCard
                  label="Total Net Salary"
                  value={fmt(bankSchedule.total_net_salary)}
                  color="text-green-700"
                />
                <div className="card !p-4">
                  <p className="text-xs text-slate-500">Period</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">
                    {bankSchedule.month_name} {bankSchedule.year}
                  </p>
                </div>
              </div>

              <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                This schedule lists the net salary to be credited to each employee's bank account.
                Employees without banking details are shown with "—".
              </div>

              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-slate-700">Bank Payment Schedule</h3>
                <button
                  onClick={() => exportToCsv(bankSchedule.schedule, `bank-schedule-${bankSchedule.month_name}-${bankSchedule.year}`, bankColumns)}
                  className="text-xs text-primary-600 hover:text-primary-800 font-medium flex items-center gap-1"
                >
                  <DocumentArrowDownIcon className="h-3.5 w-3.5" />
                  CSV
                </button>
              </div>
              <Table
                columns={bankColumns}
                data={bankSchedule.schedule || []}
                emptyMessage="No payslips found."
              />
            </>
          )}

          {!bankSchedule && !loadingBank && noData("Process a payroll run first.")}
        </div>
      )}

      {/* ── Headcount ────────────────────────────────────────────────────── */}
      {activeReport === "headcount" && (
        <div className="space-y-4">
          {headcount && (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  { label: "Total", value: headcount.total_employees, color: "text-slate-900" },
                  { label: "Active", value: headcount.active, color: "text-green-600" },
                  { label: "Inactive", value: headcount.inactive, color: "text-slate-500" },
                  { label: "Terminated", value: headcount.terminated, color: "text-red-600" },
                ].map((s) => (
                  <div key={s.label} className="card !p-4">
                    <p className="text-xs text-slate-500">{s.label}</p>
                    <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-slate-700">Headcount by Department</h3>
                <button
                  onClick={() => exportToCsv(headcount.by_department, "headcount-by-department", headcountColumns)}
                  className="text-xs text-primary-600 hover:text-primary-800 font-medium flex items-center gap-1"
                >
                  <DocumentArrowDownIcon className="h-3.5 w-3.5" />
                  CSV
                </button>
              </div>
              <Table
                columns={headcountColumns}
                data={headcount.by_department || []}
                emptyMessage="No department data."
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
