import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import api from "../../api/axios";
import { LEAVE } from "../../api/endpoints";
import { useAuthStore } from "../../store/authStore";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import Input, { Select, Textarea } from "../../components/common/Input";
import { PlusIcon, CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { format, differenceInBusinessDays } from "date-fns";

const STAGE_LABELS = {
  PENDING: "Awaiting Manager",
  MANAGER_APPROVED: "Manager Approved",
  HR_AUTHORIZED: "HR Authorized",
  MD_AUTHORIZED: "Approved",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

export default function LeaveManagement() {
  const { role, user } = useAuthStore();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState("requests");
  const [requestModal, setRequestModal] = useState(false);
  const [approvalTarget, setApprovalTarget] = useState(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm();

  const { data: requests, isLoading: loadingRequests } = useQuery({
    queryKey: ["leave-requests"],
    queryFn: () => api.get(LEAVE.REQUESTS).then((r) => r.data),
  });

  const { data: leaveTypes } = useQuery({
    queryKey: ["leave-types"],
    queryFn: () => api.get(LEAVE.TYPES).then((r) => r.data),
  });

  const { data: balances } = useQuery({
    queryKey: ["leave-balances"],
    queryFn: () =>
      api.get(`${LEAVE.BALANCES}?year=${new Date().getFullYear()}`).then((r) => r.data),
  });

  const submitMutation = useMutation({
    mutationFn: (data) => api.post(LEAVE.REQUESTS, data),
    onSuccess: () => {
      toast.success("Leave request submitted.");
      queryClient.invalidateQueries(["leave-requests"]);
      setRequestModal(false);
      reset();
    },
    onError: (err) => {
      setRequestModal(false);
      reset();
      const data = err.response?.data;
      if (!data) {
        toast.error("Failed to submit request. Please check your connection.");
        return;
      }
      if (typeof data === "string") {
        toast.error(data);
      } else if (data.detail) {
        toast.error(data.detail);
      } else {
        const firstError = Object.entries(data)
          .map(([field, msgs]) => {
            const msg = Array.isArray(msgs) ? msgs[0] : msgs;
            return `${field}: ${msg}`;
          })
          .join(" | ");
        toast.error(firstError || "Failed to submit request.");
      }
    },
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action, rejection_reason }) =>
      api.post(LEAVE.ACTION(id), { action, rejection_reason }),
    onSuccess: (_, vars) => {
      const msgs = {
        manager_approve: "Manager approval recorded.",
        hr_authorize: "HR authorization recorded.",
        md_authorize: "MD authorization recorded.",
        reject: "Leave request rejected.",
      };
      toast.success(msgs[vars.action] || "Action completed.");
      queryClient.invalidateQueries(["leave-requests"]);
      queryClient.invalidateQueries(["leave-balances"]);
      setApprovalTarget(null);
    },
    onError: () => toast.error("Action failed."),
  });

  const startDate = watch("start_date");
  const endDate = watch("end_date");
  const daysRequested =
    startDate && endDate
      ? Math.max(1, differenceInBusinessDays(new Date(endDate), new Date(startDate)) + 1)
      : 0;

  function canApproveAsManager(row) {
    return row.status === "PENDING" && (role === "ADMIN" || role === "HR" || role === "MANAGER");
  }

  function canAuthorizeAsHR(row) {
    return row.status === "MANAGER_APPROVED" && (role === "ADMIN" || role === "HR");
  }

  function canAuthorizeAsMD(row) {
    return row.status === "HR_AUTHORIZED" && (role === "ADMIN" || role === "MD");
  }

  function canReject(row) {
    if (role === "ADMIN") return true;
    if (row.status === "PENDING" && role === "MANAGER") return true;
    if (row.status === "MANAGER_APPROVED" && (role === "ADMIN" || role === "HR")) return true;
    if (row.status === "HR_AUTHORIZED" && (role === "ADMIN" || role === "MD")) return true;
    return false;
  }

  function stageAction(row) {
    if (canApproveAsManager(row)) return "manager_approve";
    if (canAuthorizeAsHR(row)) return "hr_authorize";
    if (canAuthorizeAsMD(row)) return "md_authorize";
    return null;
  }

  const requestColumns = [
    {
      key: "employee_name",
      label: "Employee",
      render: (v, row) => (
        <div>
          <p className="font-medium text-slate-900">{v}</p>
          <p className="text-xs text-slate-400">{row.employee_id_code}</p>
        </div>
      ),
    },
    { key: "leave_type_name", label: "Leave Type" },
    {
      key: "start_date",
      label: "Period",
      render: (v, row) => (
        <span className="text-sm">
          {format(new Date(v), "dd MMM")} –{" "}
          {format(new Date(row.end_date), "dd MMM yyyy")}
        </span>
      ),
    },
    {
      key: "days_requested",
      label: "Days",
      render: (v) => <span className="font-medium">{v}</span>,
    },
    {
      key: "status",
      label: "Stage",
      render: (v) => (
        <div>
          <Badge status={v} label={STAGE_LABELS[v] || v} />
        </div>
      ),
    },
    {
      key: "applied_at",
      label: "Applied",
      render: (v) => format(new Date(v), "dd MMM yyyy"),
    },
    {
      key: "actions",
      label: "Actions",
      render: (_, row) => {
        const action = stageAction(row);
        const rejectable = canReject(row);
        const terminal = ["MD_AUTHORIZED", "REJECTED", "CANCELLED"].includes(row.status);
        if (terminal) return null;
        return (
          <div className="flex gap-1">
            {action && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  actionMutation.mutate({ id: row.id, action });
                }}
                className="rounded p-1.5 text-green-600 hover:bg-green-50"
                title={action === "manager_approve" ? "Approve as Manager"
                  : action === "hr_authorize" ? "Authorize as HR"
                  : "Authorize as MD"}
              >
                <CheckIcon className="h-4 w-4" />
              </button>
            )}
            {rejectable && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setApprovalTarget({ id: row.id, action: "reject" });
                }}
                className="rounded p-1.5 text-red-600 hover:bg-red-50"
                title="Reject"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
            {!action && !rejectable && (
              <span className="text-xs text-slate-400 italic">
                {row.status === "PENDING" ? "Awaiting manager" :
                 row.status === "MANAGER_APPROVED" ? "Awaiting HR" :
                 row.status === "HR_AUTHORIZED" ? "Awaiting MD" : ""}
              </span>
            )}
          </div>
        );
      },
    },
  ];

  const balanceColumns = [
    { key: "employee_name", label: "Employee" },
    { key: "leave_type_name", label: "Leave Type" },
    { key: "year", label: "Year" },
    { key: "total_days", label: "Entitled" },
    {
      key: "used_days",
      label: "Used",
      render: (v) => <span className="text-orange-600">{v}</span>,
    },
    {
      key: "remaining_days",
      label: "Remaining",
      render: (v) => (
        <span className={`font-medium ${v > 0 ? "text-green-600" : "text-red-600"}`}>{v}</span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Leave Management</h2>
          <p className="text-sm text-slate-500">
            {requests?.count ?? 0} total requests
          </p>
        </div>
        <Button onClick={() => setRequestModal(true)}>
          <PlusIcon className="h-4 w-4" />
          Request Leave
        </Button>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {["requests", "balances"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
              tab === t
                ? "border-primary-600 text-primary-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "requests" && (
        <Table
          columns={requestColumns}
          data={requests?.results || []}
          loading={loadingRequests}
          emptyMessage="No leave requests found."
        />
      )}

      {tab === "balances" && (
        <Table
          columns={balanceColumns}
          data={balances?.results || []}
          emptyMessage="No leave balances found."
        />
      )}

      <Modal
        open={requestModal}
        onClose={() => { setRequestModal(false); reset(); }}
        title="Request Leave"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setRequestModal(false); reset(); }}>
              Cancel
            </Button>
            <Button
              loading={submitMutation.isPending}
              onClick={handleSubmit((data) =>
                submitMutation.mutate({
                  ...data,
                  leave_type: parseInt(data.leave_type, 10),
                  days_requested: Math.max(1, daysRequested),
                })
              )}
            >
              Submit Request
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Leave Type"
            required
            error={errors.leave_type?.message}
            {...register("leave_type", { required: "Leave type is required" })}
          >
            <option value="">Select leave type</option>
            {leaveTypes?.results?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.days_allowed} days/year)
              </option>
            ))}
          </Select>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Date" type="date" required
              error={errors.start_date?.message}
              {...register("start_date", { required: "Start date is required" })} />
            <Input label="End Date" type="date" required
              error={errors.end_date?.message}
              {...register("end_date", { required: "End date is required" })} />
          </div>

          {daysRequested > 0 && (
            <div className="rounded-lg bg-primary-50 border border-primary-200 px-4 py-2">
              <p className="text-sm text-primary-700">
                <strong>{daysRequested}</strong> working day(s) requested
              </p>
            </div>
          )}

          <Textarea label="Reason" required
            placeholder="Briefly describe the reason for your leave..."
            error={errors.reason?.message}
            {...register("reason", { required: "Reason is required" })} />
        </div>
      </Modal>

      <Modal
        open={!!approvalTarget}
        onClose={() => setApprovalTarget(null)}
        title="Reject Leave Request"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setApprovalTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" loading={actionMutation.isPending}
              onClick={() =>
                actionMutation.mutate({
                  id: approvalTarget?.id,
                  action: "reject",
                  rejection_reason: approvalTarget?.reason || "",
                })
              }>
              Reject
            </Button>
          </>
        }
      >
        <Textarea label="Rejection Reason (optional)" rows={3}
          value={approvalTarget?.reason || ""}
          onChange={(e) => setApprovalTarget((t) => ({ ...t, reason: e.target.value }))} />
      </Modal>
    </div>
  );
}
