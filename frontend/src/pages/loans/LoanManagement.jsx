import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import api from "../../api/axios";
import { LOANS, EMPLOYEES } from "../../api/endpoints";
import { useAuthStore } from "../../store/authStore";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import Input, { Select, Textarea } from "../../components/common/Input";
import { PlusIcon, CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { format } from "date-fns";

const fmt = (v) =>
  v != null
    ? `GHS ${Number(v).toLocaleString("en-GH", { minimumFractionDigits: 2 })}`
    : "—";

export default function LoanManagement() {
  const { role } = useAuthStore();
  const queryClient = useQueryClient();
  const isFinanceOrAdmin = ["ADMIN", "FINANCE"].includes(role);

  const [applyModal, setApplyModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  const params = new URLSearchParams();
  if (statusFilter) params.set("status", statusFilter);

  const { data, isLoading } = useQuery({
    queryKey: ["loans", statusFilter],
    queryFn: () => api.get(`${LOANS.LIST}?${params}`).then((r) => r.data),
  });

  const { data: employees } = useQuery({
    queryKey: ["employees-simple"],
    queryFn: () =>
      api
        .get(EMPLOYEES.LIST + "?employment_status=ACTIVE&page_size=200")
        .then((r) => r.data),
    enabled: isFinanceOrAdmin,
  });

  const applyMutation = useMutation({
    mutationFn: (data) => api.post(LOANS.LIST, data),
    onSuccess: () => {
      toast.success("Loan application submitted.");
      queryClient.invalidateQueries(["loans"]);
      setApplyModal(false);
      reset();
    },
    onError: (err) =>
      toast.error(err.response?.data?.detail || "Failed to submit loan."),
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action, disbursement_date }) =>
      api.post(LOANS.ACTION(id), { action, disbursement_date }),
    onSuccess: (_, vars) => {
      toast.success(
        vars.action === "approve" ? "Loan approved." : "Loan rejected."
      );
      queryClient.invalidateQueries(["loans"]);
    },
    onError: () => toast.error("Action failed."),
  });

  const columns = [
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
    {
      key: "loan_type",
      label: "Type",
      render: (v) => v?.replace(/_/g, " "),
    },
    {
      key: "amount",
      label: "Amount",
      render: (v) => <span className="font-medium">{fmt(v)}</span>,
    },
    {
      key: "monthly_deduction",
      label: "Monthly",
      render: (v) => fmt(v),
    },
    {
      key: "repayment_months",
      label: "Months",
    },
    {
      key: "outstanding_balance",
      label: "Outstanding",
      render: (v) => (
        <span className={Number(v) > 0 ? "text-orange-600" : "text-green-600"}>
          {fmt(v)}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (v) => <Badge status={v} />,
    },
    {
      key: "created_at",
      label: "Applied",
      render: (v) => format(new Date(v), "dd MMM yyyy"),
    },
    ...(isFinanceOrAdmin
      ? [
          {
            key: "id",
            label: "Actions",
            render: (v, row) =>
              row.status === "PENDING" ? (
                <div className="flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      actionMutation.mutate({
                        id: v,
                        action: "approve",
                        disbursement_date: format(new Date(), "yyyy-MM-dd"),
                      });
                    }}
                    className="rounded p-1.5 text-green-600 hover:bg-green-50"
                    title="Approve"
                  >
                    <CheckIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      actionMutation.mutate({ id: v, action: "reject" });
                    }}
                    className="rounded p-1.5 text-red-600 hover:bg-red-50"
                    title="Reject"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              ) : null,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Loans</h2>
          <p className="text-sm text-slate-500">
            {data?.count ?? 0} loan applications
          </p>
        </div>
        <Button onClick={() => setApplyModal(true)}>
          <PlusIcon className="h-4 w-4" />
          Apply for Loan
        </Button>
      </div>

      {/* Filter */}
      <div className="card !p-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="form-input w-full sm:w-48"
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="ACTIVE">Active</option>
          <option value="COMPLETED">Completed</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={data?.results || []}
        loading={isLoading}
        emptyMessage="No loan applications found."
      />

      {/* Apply modal */}
      <Modal
        open={applyModal}
        onClose={() => {
          setApplyModal(false);
          reset();
        }}
        title="Apply for Loan"
        size="md"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setApplyModal(false);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button
              loading={applyMutation.isPending}
              onClick={handleSubmit((data) => applyMutation.mutate(data))}
            >
              Submit Application
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {isFinanceOrAdmin && (
            <Select
              label="Employee"
              required
              error={errors.employee?.message}
              {...register("employee", { required: "Employee is required" })}
            >
              <option value="">Select employee</option>
              {employees?.results?.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.employee_id} — {e.full_name}
                </option>
              ))}
            </Select>
          )}

          <Select
            label="Loan Type"
            required
            error={errors.loan_type?.message}
            {...register("loan_type", { required: "Loan type is required" })}
          >
            <option value="">Select type</option>
            <option value="SALARY_ADVANCE">Salary Advance</option>
            <option value="PERSONAL_LOAN">Personal Loan</option>
            <option value="EMERGENCY_LOAN">Emergency Loan</option>
          </Select>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Loan Amount (GHS)"
              type="number"
              step="0.01"
              min="0"
              required
              error={errors.amount?.message}
              {...register("amount", { required: "Amount is required", min: 1 })}
            />
            <Input
              label="Interest Rate (%)"
              type="number"
              step="0.1"
              min="0"
              defaultValue="0"
              hint="Annual rate (0 for interest-free)"
              {...register("interest_rate")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Repayment Months"
              type="number"
              min="1"
              required
              error={errors.repayment_months?.message}
              {...register("repayment_months", {
                required: "Repayment months required",
                min: 1,
              })}
            />
            <Input
              label="Monthly Deduction (GHS)"
              type="number"
              step="0.01"
              min="0"
              required
              error={errors.monthly_deduction?.message}
              {...register("monthly_deduction", {
                required: "Monthly deduction required",
              })}
            />
          </div>

          <Textarea
            label="Notes / Purpose"
            rows={2}
            {...register("notes")}
          />
        </div>
      </Modal>
    </div>
  );
}
