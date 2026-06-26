import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import api from "../../api/axios";
import { DEPARTMENTS } from "../../api/endpoints";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import Input, { Select, Textarea } from "../../components/common/Input";
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  BuildingOfficeIcon,
  BriefcaseIcon,
} from "@heroicons/react/24/outline";

export default function Departments() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("departments"); // "departments" | "positions"

  // ── Department state ──────────────────────────────────────────────────────
  const [deptModal, setDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);

  const deptForm = useForm();

  // ── Position state ────────────────────────────────────────────────────────
  const [posModal, setPosModal] = useState(false);
  const [editingPos, setEditingPos] = useState(null);

  const posForm = useForm();

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: departments, isLoading: loadingDepts } = useQuery({
    queryKey: ["departments"],
    queryFn: () => api.get(DEPARTMENTS.LIST + "?page_size=100").then((r) => r.data),
  });

  const { data: positions, isLoading: loadingPos } = useQuery({
    queryKey: ["positions"],
    queryFn: () =>
      api.get(DEPARTMENTS.POSITIONS + "?page_size=200").then((r) => r.data),
  });

  // ── Department mutations ──────────────────────────────────────────────────
  const saveDeptMutation = useMutation({
    mutationFn: (data) =>
      editingDept
        ? api.put(DEPARTMENTS.DETAIL(editingDept.id), data)
        : api.post(DEPARTMENTS.LIST, data),
    onSuccess: () => {
      toast.success(editingDept ? "Department updated." : "Department created.");
      queryClient.invalidateQueries(["departments"]);
      closeDeptModal();
    },
    onError: (err) => {
      const msg = err.response?.data?.name?.[0] || err.response?.data?.code?.[0] || "Failed to save department.";
      toast.error(msg);
    },
  });

  const deleteDeptMutation = useMutation({
    mutationFn: (id) => api.delete(DEPARTMENTS.DETAIL(id)),
    onSuccess: () => {
      toast.success("Department deleted.");
      queryClient.invalidateQueries(["departments"]);
    },
    onError: () => toast.error("Cannot delete — department may have employees."),
  });

  // ── Position mutations ────────────────────────────────────────────────────
  const savePosMutation = useMutation({
    mutationFn: (data) =>
      editingPos
        ? api.put(DEPARTMENTS.POSITION(editingPos.id), data)
        : api.post(DEPARTMENTS.POSITIONS, data),
    onSuccess: () => {
      toast.success(editingPos ? "Position updated." : "Position created.");
      queryClient.invalidateQueries(["positions"]);
      closePosModal();
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || "Failed to save position.";
      toast.error(msg);
    },
  });

  const deletePosMutation = useMutation({
    mutationFn: (id) => api.delete(DEPARTMENTS.POSITION(id)),
    onSuccess: () => {
      toast.success("Position deleted.");
      queryClient.invalidateQueries(["positions"]);
    },
    onError: () => toast.error("Cannot delete — position may have employees."),
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  const openDeptModal = (dept = null) => {
    setEditingDept(dept);
    deptForm.reset(
      dept
        ? { name: dept.name, code: dept.code, description: dept.description }
        : { name: "", code: "", description: "" }
    );
    setDeptModal(true);
  };

  const closeDeptModal = () => {
    setDeptModal(false);
    setEditingDept(null);
    deptForm.reset();
  };

  const openPosModal = (pos = null) => {
    setEditingPos(pos);
    posForm.reset(
      pos
        ? {
            title: pos.title,
            grade: pos.grade,
            basic_salary: pos.basic_salary ?? "",
            regular_ot_rate: pos.regular_ot_rate ?? "",
            holiday_ot_rate: pos.holiday_ot_rate ?? "",
            description: pos.description,
          }
        : { title: "", grade: "", basic_salary: "", regular_ot_rate: "", holiday_ot_rate: "", description: "" }
    );
    setPosModal(true);
  };

  const closePosModal = () => {
    setPosModal(false);
    setEditingPos(null);
    posForm.reset();
  };

  // ── Columns ───────────────────────────────────────────────────────────────
  const deptColumns = [
    {
      key: "code",
      label: "Code",
      render: (v) => <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{v}</span>,
    },
    {
      key: "name",
      label: "Department",
      render: (v) => <span className="font-medium text-slate-900">{v}</span>,
    },
    {
      key: "employee_count",
      label: "Employees",
      render: (v) => (
        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary-100 text-primary-700 text-xs font-semibold">
          {v}
        </span>
      ),
    },
    {
      key: "head_name",
      label: "Head",
      render: (v) => v || <span className="text-slate-400">—</span>,
    },
    {
      key: "description",
      label: "Description",
      render: (v) => <span className="text-slate-500 text-xs">{v || "—"}</span>,
    },
    {
      key: "is_active",
      label: "Status",
      render: (v) => <Badge status={v ? "ACTIVE" : "INACTIVE"} />,
    },
    {
      key: "id",
      label: "Actions",
      render: (v, row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); openDeptModal(row); }}
            className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-primary-600"
            title="Edit"
          >
            <PencilSquareIcon className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`Delete department "${row.name}"?`)) {
                deleteDeptMutation.mutate(v);
              }
            }}
            className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
            title="Delete"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const posColumns = [
    {
      key: "title",
      label: "Position Title",
      render: (v) => <span className="font-medium text-slate-900">{v}</span>,
    },
    {
      key: "grade",
      label: "Grade / Level",
      render: (v) => v || <span className="text-slate-400">—</span>,
    },
    {
      key: "basic_salary",
      label: "Basic Salary (GHS)",
      render: (v) =>
        v != null ? (
          <span className="font-semibold text-green-700">
            {Number(v).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
          </span>
        ) : (
          <span className="text-slate-400 text-xs">Not set</span>
        ),
    },
    {
      key: "description",
      label: "Description",
      render: (v) => <span className="text-slate-500 text-xs">{v || "—"}</span>,
    },
    {
      key: "is_active",
      label: "Status",
      render: (v) => <Badge status={v ? "ACTIVE" : "INACTIVE"} />,
    },
    {
      key: "regular_ot_rate",
      label: "Reg. OT Rate",
      render: (v) =>
        v != null ? (
          <span className="font-mono text-sm">GHS {Number(v).toFixed(2)}/hr</span>
        ) : (
          <span className="text-xs text-slate-400">Auto</span>
        ),
    },
    {
      key: "holiday_ot_rate",
      label: "Hol. OT Rate",
      render: (v) =>
        v != null ? (
          <span className="font-mono text-sm">GHS {Number(v).toFixed(2)}/hr</span>
        ) : (
          <span className="text-xs text-slate-400">Auto</span>
        ),
    },
    {
      key: "id",
      label: "Actions",
      render: (v, row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); openPosModal(row); }}
            className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-primary-600"
            title="Edit"
          >
            <PencilSquareIcon className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`Delete position "${row.title}"?`)) {
                deletePosMutation.mutate(v);
              }
            }}
            className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
            title="Delete"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const deptList = departments?.results || departments || [];
  const posList = positions?.results || positions || [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Departments & Positions</h2>
          <p className="text-sm text-slate-500">
            Manage your organisational structure
          </p>
        </div>
        {tab === "departments" ? (
          <Button onClick={() => openDeptModal()}>
            <PlusIcon className="h-4 w-4" />
            Add Department
          </Button>
        ) : (
          <Button onClick={() => openPosModal()}>
            <PlusIcon className="h-4 w-4" />
            Add Position
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {[
          { key: "departments", label: "Departments", icon: BuildingOfficeIcon },
          { key: "positions", label: "Positions", icon: BriefcaseIcon },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === key
                ? "border-primary-600 text-primary-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
            <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              {key === "departments" ? deptList.length : posList.length}
            </span>
          </button>
        ))}
      </div>

      {/* Departments tab */}
      {tab === "departments" && (
        <Table
          columns={deptColumns}
          data={deptList}
          loading={loadingDepts}
          emptyMessage="No departments yet. Add your first department to get started."
        />
      )}

      {/* Positions tab */}
      {tab === "positions" && (
        <div className="space-y-4">
          <Table
            columns={posColumns}
            data={posList}
            loading={loadingPos}
            emptyMessage="No positions yet. Add positions to assign to employees."
          />
        </div>
      )}

      {/* ── Department Modal ─────────────────────────────────────────────── */}
      <Modal
        open={deptModal}
        onClose={closeDeptModal}
        title={editingDept ? "Edit Department" : "Add Department"}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={closeDeptModal}>Cancel</Button>
            <Button
              loading={saveDeptMutation.isPending}
              onClick={deptForm.handleSubmit((data) => saveDeptMutation.mutate(data))}
            >
              {editingDept ? "Save Changes" : "Create Department"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Department Name"
              required
              placeholder="e.g. Human Resources"
              error={deptForm.formState.errors.name?.message}
              {...deptForm.register("name", { required: "Name is required" })}
            />
            <Input
              label="Code"
              required
              placeholder="e.g. HR"
              error={deptForm.formState.errors.code?.message}
              {...deptForm.register("code", { required: "Code is required" })}
            />
          </div>
          <Textarea
            label="Description"
            rows={3}
            placeholder="Brief description of this department..."
            {...deptForm.register("description")}
          />
        </div>
      </Modal>

      {/* ── Position Modal ───────────────────────────────────────────────── */}
      <Modal
        open={posModal}
        onClose={closePosModal}
        title={editingPos ? "Edit Position" : "Add Position"}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={closePosModal}>Cancel</Button>
            <Button
              loading={savePosMutation.isPending}
              onClick={posForm.handleSubmit((data) => savePosMutation.mutate({
                ...data,
                basic_salary: data.basic_salary !== "" ? parseFloat(data.basic_salary) : null,
                regular_ot_rate: data.regular_ot_rate !== "" ? parseFloat(data.regular_ot_rate) : null,
                holiday_ot_rate: data.holiday_ot_rate !== "" ? parseFloat(data.holiday_ot_rate) : null,
              }))}
            >
              {editingPos ? "Save Changes" : "Create Position"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Position Title"
            required
            placeholder="e.g. Senior Accountant"
            error={posForm.formState.errors.title?.message}
            {...posForm.register("title", { required: "Title is required" })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Grade / Level"
              placeholder="e.g. Grade 5, Level 3"
              {...posForm.register("grade")}
            />
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">
                Basic Salary (GHS)
                <span className="ml-1 text-xs font-normal text-slate-400">optional</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 3500.00"
                className="form-input"
                {...posForm.register("basic_salary", {
                  min: { value: 0, message: "Must be 0 or more" },
                })}
              />
              {posForm.formState.errors.basic_salary && (
                <p className="text-xs text-red-600">{posForm.formState.errors.basic_salary.message}</p>
              )}
              <p className="text-xs text-slate-400">
                Used as payroll default when no individual salary is set for an employee.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">
                Regular OT Rate (GHS/hr)
                <span className="ml-1 text-xs font-normal text-slate-400">optional</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 25.00"
                className="form-input"
                {...posForm.register("regular_ot_rate", {
                  min: { value: 0, message: "Must be 0 or more" },
                })}
              />
              {posForm.formState.errors.regular_ot_rate && (
                <p className="text-xs text-red-600">{posForm.formState.errors.regular_ot_rate.message}</p>
              )}
              <p className="text-xs text-slate-400">
                If blank, calculated as salary / 176 hrs.
              </p>
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">
                Holiday OT Rate (GHS/hr)
                <span className="ml-1 text-xs font-normal text-slate-400">optional</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 35.00"
                className="form-input"
                {...posForm.register("holiday_ot_rate", {
                  min: { value: 0, message: "Must be 0 or more" },
                })}
              />
              {posForm.formState.errors.holiday_ot_rate && (
                <p className="text-xs text-red-600">{posForm.formState.errors.holiday_ot_rate.message}</p>
              )}
              <p className="text-xs text-slate-400">
                If blank, calculated as salary / 176 hrs.
              </p>
            </div>
          </div>
          <Textarea
            label="Description"
            rows={2}
            placeholder="Brief description of this role..."
            {...posForm.register("description")}
          />
        </div>
      </Modal>
    </div>
  );
}
