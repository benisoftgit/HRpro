import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import api from "../../api/axios";
import { PAYROLL } from "../../api/endpoints";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import { PlusIcon, PlayIcon, XCircleIcon, ArrowUturnLeftIcon, TrashIcon, ClockIcon, CurrencyDollarIcon } from "@heroicons/react/24/outline";
import { format } from "date-fns";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function PayrollList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [createModal, setCreateModal] = useState(false);
  const [newMonth, setNewMonth] = useState(new Date().getMonth() + 1);
  const [newYear, setNewYear] = useState(new Date().getFullYear());
  const [newMode, setNewMode] = useState("SALARY");

  const { data, isLoading } = useQuery({
    queryKey: ["payroll-runs"],
    queryFn: () => api.get(PAYROLL.RUNS).then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(PAYROLL.RUN(id)),
    onSuccess: () => {
      toast.success("Payroll run deleted.");
      queryClient.invalidateQueries(["payroll-runs"]);
    },
    onError: (err) =>
      toast.error(err.response?.data?.detail || "Deletion failed."),
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => api.post(PAYROLL.CANCEL(id)),
    onSuccess: (res) => {
      toast.success(res.data.detail);
      queryClient.invalidateQueries(["payroll-runs"]);
    },
    onError: (err) =>
      toast.error(err.response?.data?.detail || "Cancellation failed."),
  });

  const reopenMutation = useMutation({
    mutationFn: (id) => api.post(PAYROLL.REOPEN(id)),
    onSuccess: (res) => {
      toast.success(res.data.detail);
      queryClient.invalidateQueries(["payroll-runs"]);
    },
    onError: (err) =>
      toast.error(err.response?.data?.detail || "Reopen failed."),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api.post(PAYROLL.RUNS, { month: newMonth, year: newYear, calculation_mode: newMode }),
    onSuccess: (res) => {
      toast.success("Payroll run created.");
      queryClient.invalidateQueries(["payroll-runs"]);
      setCreateModal(false);
      navigate(`/payroll/${res.data.id}`);
    },
    onError: (err) => {
      toast.error(
        err.response?.data?.non_field_errors?.[0] ||
          "Failed to create payroll run."
      );
    },
  });

  const columns = [
    {
      key: "month_name",
      label: "Period",
      render: (val, row) => (
        <span className="font-medium text-slate-900">
          {val} {row.year}
        </span>
      ),
    },
    {
      key: "payslip_count",
      label: "Employees",
      render: (val) => val ?? 0,
    },
    {
      key: "total_gross",
      label: "Gross Payroll",
      render: (val) =>
        val ? `GHS ${Number(val).toLocaleString("en-GH", { minimumFractionDigits: 2 })}` : "—",
    },
    {
      key: "total_net",
      label: "Net Payroll",
      render: (val) =>
        val ? `GHS ${Number(val).toLocaleString("en-GH", { minimumFractionDigits: 2 })}` : "—",
    },
    {
      key: "total_paye",
      label: "PAYE Tax",
      render: (val) =>
        val ? `GHS ${Number(val).toLocaleString("en-GH", { minimumFractionDigits: 2 })}` : "—",
    },
    {
      key: "calculation_mode",
      label: "Mode",
      render: (val) => (
        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
          val === "TIMESHEET"
            ? "bg-amber-100 text-amber-700"
            : "bg-blue-100 text-blue-700"
        }`}>
          {val === "TIMESHEET" ? <ClockIcon className="h-3 w-3" /> : <CurrencyDollarIcon className="h-3 w-3" />}
          {val === "TIMESHEET" ? "Timesheet" : "Salary Grade"}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (val) => <Badge status={val} />,
    },
    {
      key: "created_at",
      label: "Created",
      render: (val) => (val ? format(new Date(val), "dd MMM yyyy") : "—"),
    },
    {
      key: "actions",
      label: "",
      render: (_, row) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {row.status === "DRAFT" && (
            <button
              onClick={() => deleteMutation.mutate(row.id)}
              className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Delete"
              disabled={deleteMutation.isPending}
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          )}
          {row.status === "COMPLETED" && (
            <button
              onClick={() => cancelMutation.mutate(row.id)}
              className="p-1.5 rounded text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
              title="Cancel run"
              disabled={cancelMutation.isPending}
            >
              <XCircleIcon className="h-4 w-4" />
            </button>
          )}
          {(row.status === "COMPLETED" || row.status === "CANCELLED") && (
            <button
              onClick={() => reopenMutation.mutate(row.id)}
              className="p-1.5 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              title="Reopen as draft"
              disabled={reopenMutation.isPending}
            >
              <ArrowUturnLeftIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Payroll</h2>
          <p className="text-sm text-slate-500">
            Monthly payroll runs and payslip management
          </p>
        </div>
        <Button onClick={() => setCreateModal(true)}>
          <PlusIcon className="h-4 w-4" />
          New Payroll Run
        </Button>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={data?.results || []}
        loading={isLoading}
        emptyMessage="No payroll runs yet. Create your first payroll run."
        onRowClick={(row) => navigate(`/payroll/${row.id}`)}
      />

      {/* Create modal */}
      <Modal
        open={createModal}
        onClose={() => setCreateModal(false)}
        title="Create Payroll Run"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateModal(false)}>
              Cancel
            </Button>
            <Button
              loading={createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              <PlayIcon className="h-4 w-4" />
              Create Run
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Select the month and year for this payroll run. Each month can only
            have one payroll run.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">
                Month
              </label>
              <select
                value={newMonth}
                onChange={(e) => setNewMonth(Number(e.target.value))}
                className="form-input"
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">
                Year
              </label>
              <select
                value={newYear}
                onChange={(e) => setNewYear(Number(e.target.value))}
                className="form-input"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">
              Calculation Method
            </label>
            <select
              value={newMode}
              onChange={(e) => setNewMode(e.target.value)}
              className="form-input"
            >
              <option value="SALARY">Salary Grade — uses fixed basic salary + OT rates</option>
              <option value="TIMESHEET">Timesheet — computes pay from attendance hours × hourly rate</option>
            </select>
            <p className="text-xs text-slate-400 mt-1">
              {newMode === "TIMESHEET"
                ? "Regular pay = hours worked × hourly rate. Requires attendance records with clock in/out times."
                : "Basic salary from employee's salary structure or position. Attendance overtime is added."}
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
