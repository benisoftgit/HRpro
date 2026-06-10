import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import api from "../../api/axios";
import { PAYROLL } from "../../api/endpoints";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import { exportToCsv } from "../../utils/csv";
import {
  AdjustmentsHorizontalIcon,
  ArrowLeftIcon,
  PlayIcon,
  CheckCircleIcon,
  EnvelopeIcon,
  XCircleIcon,
  ArrowUturnLeftIcon,
  DocumentArrowDownIcon,
  ChatBubbleLeftEllipsisIcon,
  ClockIcon,
  CurrencyDollarIcon,
} from "@heroicons/react/24/outline";

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

const fmt = (v) =>
  v != null
    ? `GHS ${Number(v).toLocaleString("en-GH", { minimumFractionDigits: 2 })}`
    : "—";

export default function PayrollRun() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: run, isLoading } = useQuery({
    queryKey: ["payroll-run", id],
    queryFn: () => api.get(PAYROLL.RUN(id)).then((r) => r.data),
  });

  const processMutation = useMutation({
    mutationFn: () => api.post(PAYROLL.PROCESS(id)),
    onSuccess: (res) => {
      toast.success(res.data.detail);
      queryClient.invalidateQueries(["payroll-run", id]);
    },
    onError: (err) =>
      toast.error(err.response?.data?.detail || "Processing failed."),
  });

  const finalizeMutation = useMutation({
    mutationFn: () => api.post(PAYROLL.FINALIZE(id)),
    onSuccess: (res) => {
      toast.success(res.data.detail);
      queryClient.invalidateQueries(["payroll-run", id]);
    },
    onError: () => toast.error("Finalization failed."),
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.post(PAYROLL.CANCEL(id)),
    onSuccess: (res) => {
      toast.success(res.data.detail);
      queryClient.invalidateQueries(["payroll-run", id]);
    },
    onError: (err) =>
      toast.error(err.response?.data?.detail || "Cancellation failed."),
  });

  const reopenMutation = useMutation({
    mutationFn: () => api.post(PAYROLL.REOPEN(id)),
    onSuccess: (res) => {
      toast.success(res.data.detail);
      queryClient.invalidateQueries(["payroll-run", id]);
    },
    onError: (err) =>
      toast.error(err.response?.data?.detail || "Reopen failed."),
  });

  const sendMutation = useMutation({
    mutationFn: () => api.post(PAYROLL.SEND_PAYSLIPS(id)),
    onSuccess: (res) => {
      const errors = res.data?.errors;
      if (errors?.length) {
        toast.error(errors[0], { duration: 6000 });
        toast.success(res.data.detail);
      } else {
        toast.success(res.data.detail);
      }
      queryClient.invalidateQueries(["payroll-run", id]);
    },
    onError: () => toast.error("Failed to send payslips."),
  });

  const sendSingleMutation = useMutation({
    mutationFn: (payslipId) => api.post(PAYROLL.PAYSLIP_SEND(payslipId)),
    onSuccess: (res) => {
      toast.success(res.data.detail);
      queryClient.invalidateQueries(["payroll-run", id]);
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Failed to send payslip."),
  });

  function waPhone(phone) {
    if (!phone) return null;
    const cleaned = phone.replace(/[\s\-\(\)\+]/g, "");
    if (cleaned.startsWith("0")) return "233" + cleaned.slice(1);
    if (cleaned.startsWith("233")) return cleaned;
    return cleaned;
  }

  const downloadPdf = async (payslipId, employeeId, monthName, year) => {
    try {
      const token = localStorage.getItem("access_token");
      const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
      const res = await fetch(`${baseUrl}${PAYROLL.PAYSLIP_PDF(payslipId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { toast.error("Failed to download PDF."); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payslip-${employeeId}-${monthName}-${year}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch { toast.error("Download failed."); }
  };

  function payslipSummary(row) {
    return (
      `*Payslip — ${row.employee_name}*\n` +
      `Basic: GHS ${Number(row.basic_salary).toLocaleString()}\n` +
      `Allowances: GHS ${Number(row.total_allowances).toLocaleString()}\n` +
      `Gross: GHS ${Number(row.gross_salary).toLocaleString()}\n` +
      `SSNIT: GHS ${Number(row.ssnit_employee).toLocaleString()}\n` +
      `PAYE: GHS ${Number(row.paye_tax).toLocaleString()}\n` +
      `Net Pay: GHS ${Number(row.net_salary).toLocaleString()}`
    );
  }

  const columns = [
    {
      key: "employee_id_code",
      label: "ID",
      render: (v) => <span className="font-mono text-xs text-slate-500">{v}</span>,
    },
    { key: "employee_name", label: "Employee" },
    { key: "department", label: "Department" },
    {
      key: "basic_salary",
      label: "Basic",
      render: (v) => fmt(v),
    },
    {
      key: "total_allowances",
      label: "Allowances",
      render: (v) => fmt(v),
    },
    {
      key: "gross_salary",
      label: "Gross",
      render: (v) => (
        <span className="font-medium text-slate-900">{fmt(v)}</span>
      ),
    },
    {
      key: "paye_tax",
      label: "PAYE",
      render: (v) => (
        <span className="text-red-600">{fmt(v)}</span>
      ),
    },
    {
      key: "ssnit_employee",
      label: "SSNIT",
      render: (v) => fmt(v),
    },
    {
      key: "net_salary",
      label: "Net Pay",
      render: (v) => (
        <span className="font-bold text-green-700">{fmt(v)}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (v) => <Badge status={v} />,
    },
    {
      key: "actions",
      label: "Share",
      render: (_, row) => {
        const phone = waPhone(row.employee_phone);
        const waUrl = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(payslipSummary(row))}` : null;
        return (
          <div className="flex items-center gap-1">
            <button
              onClick={() => sendSingleMutation.mutate(row.id)}
              className="rounded p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              title={row.employee_email ? `Email to ${row.employee_email}` : "No email on file"}
              disabled={sendSingleMutation.isPending || !row.employee_email}
            >
              <EnvelopeIcon className="h-4 w-4" />
            </button>
            {waUrl && (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                title="Share on WhatsApp"
              >
                <ChatBubbleLeftEllipsisIcon className="h-4 w-4" />
              </a>
            )}
            <button
              onClick={() => downloadPdf(row.id, row.employee_id_code, run?.month_name, run?.year)}
              className="rounded p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
              title="Download PDF"
            >
              <DocumentArrowDownIcon className="h-4 w-4" />
            </button>
          </div>
        );
      },
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  const isDraft = run?.status === "DRAFT";
  const isCompleted = run?.status === "COMPLETED";
  const isCancelled = run?.status === "CANCELLED";
  const isProcessing = run?.status === "PROCESSING";
  const hasPayslips = run?.payslips?.length > 0;
  const hasFinalPayslips = run?.payslips?.some((p) => p.status === "FINAL");

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/payroll")}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-slate-900">
                {run?.month_name} {run?.year}
              </h2>
              <Badge status={run?.status} />
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                run?.calculation_mode === "TIMESHEET"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-blue-100 text-blue-700"
              }`}>
                {run?.calculation_mode === "TIMESHEET" ? <ClockIcon className="h-3 w-3" /> : <CurrencyDollarIcon className="h-3 w-3" />}
                {run?.calculation_mode === "TIMESHEET" ? "Timesheet" : "Salary Grade"}
              </span>
            </div>
            <p className="text-sm text-slate-500">
              {run?.payslip_count ?? 0} employees · Created by{" "}
              {run?.created_by_name}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {isDraft && (
            <Button
              loading={processMutation.isPending}
              onClick={() => processMutation.mutate()}
            >
              <PlayIcon className="h-4 w-4" />
              Process Payroll
            </Button>
          )}
          {isCompleted && hasPayslips && !hasFinalPayslips && (
            <Button
              loading={finalizeMutation.isPending}
              onClick={() => finalizeMutation.mutate()}
            >
              <CheckCircleIcon className="h-4 w-4" />
              Finalize Payslips
            </Button>
          )}
          {hasFinalPayslips && (
            <Button
              variant="secondary"
              loading={sendMutation.isPending}
              onClick={() => sendMutation.mutate()}
            >
              <EnvelopeIcon className="h-4 w-4" />
              Email Payslips
            </Button>
          )}
          {(isCompleted || isCancelled) && !isProcessing && (
            <Button
              variant="secondary"
              loading={reopenMutation.isPending}
              onClick={() => reopenMutation.mutate()}
            >
              <ArrowUturnLeftIcon className="h-4 w-4" />
              Reopen as Draft
            </Button>
          )}
          {isCompleted && !isProcessing && (
            <Button
              variant="danger"
              loading={cancelMutation.isPending}
              onClick={() => cancelMutation.mutate()}
            >
              <XCircleIcon className="h-4 w-4" />
              Cancel Run
            </Button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      {hasPayslips && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <SummaryCard label="Total Gross" value={fmt(run?.total_gross)} />
          <SummaryCard label="Total Net" value={fmt(run?.total_net)} />
          <SummaryCard label="Total PAYE" value={fmt(run?.total_paye)} />
          <SummaryCard
            label="SSNIT (Employee)"
            value={fmt(run?.total_ssnit_employee)}
          />
        </div>
      )}

      {/* Adjustments section — DRAFT only */}
      {isDraft && <AdjustmentsSection runId={id} />}

      {/* Payslips table */}
      <div>
        <h3 className="text-base font-semibold text-slate-900 mb-3">
          Payslips
        </h3>
        <Table
          columns={columns}
          data={run?.payslips || []}
          emptyMessage={
            isDraft
              ? "Click 'Process Payroll' to generate payslips for all active employees."
              : "No payslips found."
          }
        />
      </div>
    </div>
  );
}

// ── Adjustments Section ──────────────────────────────────────────────────────
function AdjustmentsSection({ runId }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [edits, setEdits] = useState({});

  const { data: employees, isLoading } = useQuery({
    queryKey: ["eligible-employees", runId],
    queryFn: () => api.get(PAYROLL.ELIGIBLE_EMPLOYEES(runId)).then((r) => r.data),
    enabled: expanded,
  });

  const saveMutation = useMutation({
    mutationFn: ({ adjId, data }) =>
      adjId
        ? api.patch(PAYROLL.ADJUSTMENT(runId, adjId), data)
        : api.post(PAYROLL.ADJUSTMENTS(runId), data),
    onSuccess: () => {
      queryClient.invalidateQueries(["eligible-employees", runId]);
      toast.success("Adjustment saved.");
    },
    onError: () => toast.error("Failed to save adjustment."),
  });

  const handleEdit = (empId, field, value) => {
    setEdits((prev) => ({
      ...prev,
      [empId]: { ...prev[empId], [field]: value },
    }));
  };

  const handleSave = (emp) => {
    const e = edits[emp.employee_id] || {};
    const data = {
      employee: emp.employee_id,
      regular_ot_hours: e.regular_ot_hours ?? emp.regular_ot_hours ?? "0.00",
      holiday_ot_hours: e.holiday_ot_hours ?? emp.holiday_ot_hours ?? "0.00",
      additional_allowance: e.additional_allowance ?? emp.additional_allowance ?? "0.00",
      additional_allowance_label: e.additional_allowance_label ?? emp.additional_allowance_label ?? "",
    };
    saveMutation.mutate({ adjId: emp.adjustment_id, data });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <AdjustmentsHorizontalIcon className="h-5 w-5 text-slate-500" />
          <span className="text-sm font-semibold text-slate-900">
            Pre-Process Adjustments
          </span>
          <span className="text-xs text-slate-400">
            (Overtime &amp; ad-hoc allowances per employee)
          </span>
        </div>
        <svg
          className={`h-4 w-4 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 px-5 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Employee</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Dept / Grade</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase">Basic Salary</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Allowances</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase">Reg. OT Rate</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase">Reg. OT Hrs</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase">Hol. OT Rate</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase">Hol. OT Hrs</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase">Ad-Hoc Allowance</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Label</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-slate-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(employees || []).map((emp) => {
                    const e = edits[emp.employee_id] || {};
                    const rot = e.regular_ot_hours ?? emp.regular_ot_hours ?? "0.00";
                    const hot = e.holiday_ot_hours ?? emp.holiday_ot_hours ?? "0.00";
                    const aa = e.additional_allowance ?? emp.additional_allowance ?? "0.00";
                    const al = e.additional_allowance_label ?? emp.additional_allowance_label ?? "";
                    return (
                      <tr key={emp.employee_id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-2">
                          <span className="font-medium text-slate-900">{emp.employee_name}</span>
                          <span className="block text-xs text-slate-400">{emp.employee_code}</span>
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {emp.department || "—"}
                          {emp.grade && <span className="block text-xs text-slate-400">{emp.grade}</span>}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-slate-700">
                          GHS {Number(emp.basic_salary).toLocaleString()}
                        </td>
                        <td className="px-3 py-2">
                          {emp.allowances?.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {emp.allowances.map((a, i) => (
                                <span key={i} className="inline-block rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                                  {a.name}: GHS {Number(a.amount).toLocaleString()}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">None</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-xs text-slate-500">
                          GHS {Number(emp.regular_ot_rate).toFixed(2)}/hr
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            value={rot}
                            onChange={(e) => handleEdit(emp.employee_id, "regular_ot_hours", e.target.value)}
                            className="w-20 rounded border border-slate-300 px-2 py-1 text-right text-sm focus:border-primary-500 focus:outline-none"
                          />
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-xs text-slate-500">
                          GHS {Number(emp.holiday_ot_rate).toFixed(2)}/hr
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            value={hot}
                            onChange={(e) => handleEdit(emp.employee_id, "holiday_ot_hours", e.target.value)}
                            className="w-20 rounded border border-slate-300 px-2 py-1 text-right text-sm focus:border-primary-500 focus:outline-none"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            step="10"
                            min="0"
                            value={aa}
                            onChange={(e) => handleEdit(emp.employee_id, "additional_allowance", e.target.value)}
                            className="w-24 rounded border border-slate-300 px-2 py-1 text-right text-sm focus:border-primary-500 focus:outline-none"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={al}
                            placeholder="e.g. Bonus"
                            onChange={(e) => handleEdit(emp.employee_id, "additional_allowance_label", e.target.value)}
                            className="w-28 rounded border border-slate-300 px-2 py-1 text-sm focus:border-primary-500 focus:outline-none"
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          {e.regular_ot_hours !== undefined ||
                           e.holiday_ot_hours !== undefined ||
                           e.additional_allowance !== undefined ||
                           e.additional_allowance_label !== undefined ? (
                            <Button
                              size="sm"
                              onClick={() => handleSave(emp)}
                              loading={saveMutation.isPending}
                            >
                              Save
                            </Button>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
