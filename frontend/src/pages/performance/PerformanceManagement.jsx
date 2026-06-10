import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import api from "../../api/axios";
import { PERFORMANCE, EMPLOYEES } from "../../api/endpoints";
import { useAuthStore } from "../../store/authStore";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import Input, { Select, Textarea } from "../../components/common/Input";
import {
  PlusIcon,
  CheckIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";

const STATUS_VARIANTS = {
  PENDING: "PENDING",
  SELF_REVIEW: "SELF_REVIEW",
  MANAGER_REVIEW: "MANAGER_REVIEW",
  HR_REVIEW: "HR_REVIEW",
  COMPLETED: "COMPLETED",
};

const CYCLE_STATUS_VARIANTS = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  CLOSED: "CLOSED",
};

export default function PerformanceManagement() {
  const { role, user } = useAuthStore();
  const queryClient = useQueryClient();
  const isHROrAdmin = ["ADMIN", "HR"].includes(role);
  const isManagerOrAbove = ["ADMIN", "HR", "MANAGER", "MD"].includes(role);

  const [activeCycle, setActiveCycle] = useState(null); // null = auto, "" = all, number = specific
  const [reviewModal, setReviewModal] = useState(false);
  const [cycleModal, setCycleModal] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const { register: registerC, handleSubmit: handleC, reset: resetC, formState: { errors: errC } } = useForm();

  // Fetch review cycles
  const { data: cycles, isLoading: loadingCycles } = useQuery({
    queryKey: ["review-cycles"],
    queryFn: () => api.get(PERFORMANCE.CYCLES).then((r) => r.data),
  });

  const cycleList = cycles?.results || [];
  const selectedCycle = activeCycle ?? cycleList.find((c) => c.status === "ACTIVE")?.id ?? "";

  // Fetch reviews for the selected cycle ("" = all cycles)
  const { data: reviews, isLoading: loadingReviews } = useQuery({
    queryKey: ["performance-reviews", selectedCycle],
    queryFn: () =>
      api
        .get(`${PERFORMANCE.REVIEWS}${selectedCycle ? `?cycle=${selectedCycle}` : ""}`)
        .then((r) => r.data),
  });

  const reviewList = reviews?.results || [];

  // Fetch employees for the new review dropdown
  const { data: employees } = useQuery({
    queryKey: ["employees-simple"],
    queryFn: () => api.get(EMPLOYEES.LIST + "?page_size=100").then((r) => r.data),
  });
  const employeeList = employees?.results || [];

  // Fetch dashboard stats
  const { data: dashboard } = useQuery({
    queryKey: ["performance-dashboard", selectedCycle],
    queryFn: () =>
      api
        .get(`${PERFORMANCE.DASHBOARD}${selectedCycle ? `?cycle=${selectedCycle}` : ""}`)
        .then((r) => r.data),
    enabled: isHROrAdmin && !!selectedCycle,
  });

  // Create review cycle
  const createCycle = useMutation({
    mutationFn: (data) => api.post(PERFORMANCE.CYCLES, data),
    onSuccess: () => {
      toast.success("Review cycle created.");
      queryClient.invalidateQueries(["review-cycles"]);
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Failed to create cycle."),
  });

  // Create performance review
  const createReview = useMutation({
    mutationFn: (data) => api.post(PERFORMANCE.REVIEWS, data),
    onSuccess: () => {
      toast.success("Review created.");
      queryClient.invalidateQueries(["performance-reviews"]);
      setReviewModal(false);
      reset();
    },
    onError: (err) => {
      const data = err.response?.data;
      if (typeof data === "string") toast.error(data);
      else if (data?.detail) toast.error(data.detail);
      else if (data) {
        const msg = Object.entries(data).map(([f, m]) => `${f}: ${Array.isArray(m) ? m[0] : m}`).join(" | ");
        toast.error(msg || "Failed to create review.");
      } else {
        toast.error("Failed to create review.");
      }
    },
  });

  // Submit review action
  const actionMutation = useMutation({
    mutationFn: ({ id, action }) =>
      api.post(PERFORMANCE.REVIEW_ACTION(id), { action }),
    onSuccess: () => {
      toast.success("Review status updated.");
      queryClient.invalidateQueries(["performance-reviews"]);
      setDetailModal(false);
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Action failed."),
  });

  const columns = [
    { key: "employee_name", label: "Employee" },
    {
      key: "status",
      label: "Status",
      render: (val) => <Badge status={STATUS_VARIANTS[val] || val} />,
    },
    {
      key: "self_rating",
      label: "Self",
      render: (val) => val ?? "—",
    },
    {
      key: "manager_rating",
      label: "Manager",
      render: (val) => val ?? "—",
    },
    {
      key: "final_rating",
      label: "Final",
      render: (val) => val ?? "—",
    },
    {
      key: "kpi_score",
      label: "KPI %",
      render: (val) => (val != null ? `${Math.round(val)}%` : "—"),
    },
    ...(isManagerOrAbove
      ? [
          {
            key: "actions",
            label: "",
            render: (_, row) => (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedReview(row);
                  setDetailModal(true);
                }}
                className="text-primary-600 hover:text-primary-800 text-sm font-medium"
              >
                View
              </button>
            ),
          },
        ]
      : []),
  ];

  const onSubmitReview = (data) => {
    if (!selectedCycle) {
      toast.error("No active review cycle. Create a cycle first.");
      return;
    }
    createReview.mutate({
      employee: parseInt(data.employee, 10),
      cycle: selectedCycle,
    });
  };

  const onSubmitCycle = (data) => {
    createCycle.mutate(data);
  };

  const canActOnReview = (review) => {
    if (role === "ADMIN") return true;
    if (review.status === "SELF_REVIEW" && role === "EMPLOYEE") return true;
    if (review.status === "MANAGER_REVIEW" && role === "MANAGER") return true;
    if (review.status === "HR_REVIEW" && ["HR", "ADMIN"].includes(role)) return true;
    return false;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Performance Management</h2>
          <p className="text-sm text-slate-500 mt-1">
            Review cycles, appraisals, and KPIs
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isHROrAdmin && (
            <>
              <Button variant="secondary" onClick={() => setCycleModal(true)}>
                <PlusIcon className="h-4 w-4" />
                New Cycle
              </Button>
              <Button onClick={() => setReviewModal(true)}>
                <PlusIcon className="h-4 w-4" />
                New Review
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Cycles bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveCycle("")}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            activeCycle === ""
              ? "bg-primary-600 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          All Cycles
        </button>
        {cycleList.map((cycle) => (
          <button
            key={cycle.id}
            onClick={() => setActiveCycle(cycle.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeCycle === cycle.id
                ? "bg-primary-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {cycle.name}
            <Badge status={CYCLE_STATUS_VARIANTS[cycle.status] || cycle.status} />
          </button>
        ))}
      </div>

      {/* Dashboard summary */}
      {dashboard && isHROrAdmin && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="card">
            <p className="text-sm text-slate-500">Total Reviews</p>
            <p className="text-2xl font-bold text-slate-900">{dashboard.total || 0}</p>
          </div>
          <div className="card">
            <p className="text-sm text-slate-500">Completed</p>
            <p className="text-2xl font-bold text-green-600">{dashboard.by_status?.COMPLETED || 0}</p>
          </div>
          <div className="card">
            <p className="text-sm text-slate-500">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">{dashboard.by_status?.PENDING || 0}</p>
          </div>
          <div className="card">
            <p className="text-sm text-slate-500">Avg Rating</p>
            <p className="text-2xl font-bold text-slate-900">
              {dashboard.average_final_rating != null
                ? dashboard.average_final_rating.toFixed(1)
                : "—"}
            </p>
          </div>
        </div>
      )}

      {/* Reviews table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Performance Reviews</h3>
        </div>
        <Table
          columns={columns}
          data={reviewList}
          loading={loadingReviews}
          emptyMessage={
            selectedCycle
              ? "No reviews for this cycle."
              : "Select a cycle to view reviews."
          }
          onRowClick={
            isManagerOrAbove
              ? (row) => {
                  setSelectedReview(row);
                  setDetailModal(true);
                }
              : undefined
          }
        />
      </div>

      {/* New Review Modal */}
      <Modal
        open={reviewModal}
        onClose={() => {
          setReviewModal(false);
          reset();
        }}
        title="New Performance Review"
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmitReview)} className="space-y-4">
          <Select
            label="Employee"
            required
            error={errors.employee?.message}
            {...register("employee", { required: "Employee is required" })}
          >
            <option value="">Select employee</option>
            {employeeList.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.full_name} ({emp.employee_id})
              </option>
            ))}
          </Select>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setReviewModal(false);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={createReview.isPending}>
              Create
            </Button>
          </div>
        </form>
      </Modal>

      {/* Cycle Modal */}
      <Modal
        open={cycleModal}
        onClose={() => { setCycleModal(false); resetC(); }}
        title="New Review Cycle"
        size="md"
      >
        <form onSubmit={handleC(onSubmitCycle)} className="space-y-4">
          <Input label="Cycle Name" required
            error={errC.name?.message} {...registerC("name", { required: "Name is required" })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Date" type="date" required
              error={errC.start_date?.message}
              {...registerC("start_date", { required: "Start date is required" })} />
            <Input label="End Date" type="date" required
              error={errC.end_date?.message}
              {...registerC("end_date", { required: "End date is required" })} />
          </div>
          <Textarea label="Description" rows={3}
            {...registerC("description")} />
          <Select label="Status" required
            error={errC.status?.message}
            {...registerC("status", { required: true })}
          >
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
          </Select>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="secondary"
              onClick={() => { setCycleModal(false); resetC(); }}>
              Cancel
            </Button>
            <Button type="submit" loading={createCycle.isPending}>
              Create Cycle
            </Button>
          </div>
        </form>
      </Modal>

      {/* Review Detail Modal */}
      <Modal
        open={detailModal}
        onClose={() => {
          setDetailModal(false);
          setSelectedReview(null);
        }}
        title={`Review — ${selectedReview?.employee_name || ""}`}
        size="lg"
      >
        {selectedReview && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-500">Employee</p>
                <p className="font-medium text-slate-900">{selectedReview.employee_name}</p>
                <p className="text-xs text-slate-400">{selectedReview.employee_id_code}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Department</p>
                <p className="font-medium text-slate-900">{selectedReview.department_name || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Status</p>
                <Badge status={STATUS_VARIANTS[selectedReview.status] || selectedReview.status} />
              </div>
              <div>
                <p className="text-sm text-slate-500">KPI Score</p>
                <p className="font-medium text-slate-900">
                  {selectedReview.kpi_score != null ? `${Math.round(selectedReview.kpi_score)}%` : "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Self Rating</p>
                <p className="font-medium text-slate-900">{selectedReview.self_rating ?? "—"}/5</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Manager Rating</p>
                <p className="font-medium text-slate-900">{selectedReview.manager_rating ?? "—"}/5</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Final Rating</p>
                <p className="font-medium text-slate-900">{selectedReview.final_rating ?? "—"}/5</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Reviewer</p>
                <p className="font-medium text-slate-900">{selectedReview.reviewer_name || "—"}</p>
              </div>
            </div>

            {/* Status action buttons */}
            <div className="border-t border-slate-200 pt-4">
              <p className="text-sm font-medium text-slate-700 mb-3">Actions</p>
              {selectedReview.status === "PENDING" && role === "EMPLOYEE" && (
                <Button
                  onClick={() =>
                    actionMutation.mutate({ id: selectedReview.id, action: "submit_self" })
                  }
                  loading={actionMutation.isPending}
                  size="sm"
                >
                  <CheckIcon className="h-4 w-4" />
                  Submit Self-Review
                </Button>
              )}
              {selectedReview.status === "SELF_REVIEW" && ["MANAGER", "ADMIN", "HR"].includes(role) && (
                <Button
                  onClick={() =>
                    actionMutation.mutate({ id: selectedReview.id, action: "submit_manager" })
                  }
                  loading={actionMutation.isPending}
                  size="sm"
                >
                  <ChevronRightIcon className="h-4 w-4" />
                  Submit as Manager
                </Button>
              )}
              {selectedReview.status === "MANAGER_REVIEW" && ["HR", "ADMIN"].includes(role) && (
                <Button
                  onClick={() =>
                    actionMutation.mutate({ id: selectedReview.id, action: "submit_hr" })
                  }
                  loading={actionMutation.isPending}
                  size="sm"
                >
                  <ChevronRightIcon className="h-4 w-4" />
                  Submit as HR
                </Button>
              )}
              {selectedReview.status === "HR_REVIEW" && ["HR", "ADMIN"].includes(role) && (
                <Button
                  onClick={() =>
                    actionMutation.mutate({ id: selectedReview.id, action: "complete" })
                  }
                  loading={actionMutation.isPending}
                  size="sm"
                >
                  <CheckIcon className="h-4 w-4" />
                  Complete Review
                </Button>
              )}
              {!canActOnReview(selectedReview) && (
                <p className="text-xs text-slate-400 italic">
                  No actions available for your role at this stage.
                </p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
