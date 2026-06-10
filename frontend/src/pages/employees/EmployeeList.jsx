import React, { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import api from "../../api/axios";
import { EMPLOYEES, DEPARTMENTS } from "../../api/endpoints";
import { useAuthStore } from "../../store/authStore";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import {
  PlusIcon,
  MagnifyingGlassIcon,
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  DocumentArrowUpIcon,
  PencilSquareIcon,
  NoSymbolIcon,
} from "@heroicons/react/24/outline";

export default function EmployeeList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { role } = useAuthStore();
  const isHROrAdmin = ["ADMIN", "HR"].includes(role);

  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [importModal, setImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [templateLoading, setTemplateLoading] = useState(false);
  const fileInputRef = useRef(null);

  // Build query params
  const params = new URLSearchParams({ page });
  if (search) params.set("search", search);
  if (deptFilter) params.set("department", deptFilter);
  if (statusFilter) params.set("employment_status", statusFilter);

  const { data, isLoading } = useQuery({
    queryKey: ["employees", search, deptFilter, statusFilter, page],
    queryFn: () => api.get(`${EMPLOYEES.LIST}?${params}`).then((r) => r.data),
    keepPreviousData: true,
  });

  const { data: departments } = useQuery({
    queryKey: ["departments-simple"],
    queryFn: () =>
      api.get(DEPARTMENTS.LIST + "?simple=true&page_size=100").then((r) => r.data),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id) =>
      api.patch(EMPLOYEES.DETAIL(id), { employment_status: "INACTIVE" }),
    onSuccess: () => {
      toast.success("Employee deactivated.");
      queryClient.invalidateQueries(["employees"]);
      setDeactivateTarget(null);
    },
    onError: () => toast.error("Failed to deactivate employee."),
  });

  const importMutation = useMutation({
    mutationFn: (formData) =>
      api.post(EMPLOYEES.IMPORT, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      }),
    onSuccess: (res) => {
      setImportResult(res.data);
      queryClient.invalidateQueries(["employees"]);
      toast.success(res.data.detail);
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || "Import failed.";
      toast.error(msg);
    },
  });

  const handleTemplateDownload = async () => {
    setTemplateLoading(true);
    try {
      const res = await api.get(EMPLOYEES.IMPORT_TEMPLATE, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "employee_import_template.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download template.");
    } finally {
      setTemplateLoading(false);
    }
  };

  const handleImportSubmit = () => {
    if (!importFile) {
      toast.error("Please select a CSV file.");
      return;
    }
    const formData = new FormData();
    formData.append("file", importFile);
    importMutation.mutate(formData);
  };

  const handleImportClose = () => {
    setImportModal(false);
    setImportFile(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const columns = [
    {
      key: "employee_id",
      label: "ID",
      render: (val) => (
        <span className="font-mono text-xs text-slate-500">{val}</span>
      ),
    },
    {
      key: "full_name",
      label: "Name",
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-semibold flex-shrink-0">
            {row.first_name?.[0]}{row.last_name?.[0]}
          </div>
          <div>
            <p className="font-medium text-slate-900">{val}</p>
            <p className="text-xs text-slate-400">{row.personal_email || "—"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "department_name",
      label: "Department",
      render: (val) => val || "—",
    },
    {
      key: "position_title",
      label: "Position",
      render: (val) => val || "—",
    },
    {
      key: "employment_type",
      label: "Type",
      render: (val) => (
        <span className="text-xs text-slate-500">
          {val?.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      key: "employment_status",
      label: "Status",
      render: (val) => <Badge status={val} />,
    },
    {
      key: "id",
      label: "Actions",
      render: (val, row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/employees/${val}/edit`);
            }}
            className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-primary-600"
            title="Edit"
          >
            <PencilSquareIcon className="h-4 w-4" />
          </button>
          {row.employment_status === "ACTIVE" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDeactivateTarget(row);
              }}
              className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
              title="Deactivate"
            >
              <NoSymbolIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Employees</h2>
          <p className="text-sm text-slate-500">
            {data?.count ?? 0} total employees
          </p>
        </div>
        <div className="flex gap-2">
          {isHROrAdmin && (
            <Button variant="secondary" onClick={() => setImportModal(true)}>
              <ArrowUpTrayIcon className="h-4 w-4" />
              Import Employees
            </Button>
          )}
          <Link to="/employees/new">
            <Button>
              <PlusIcon className="h-4 w-4" />
              Add Employee
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="card !p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          {/* Search */}
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, ID, email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="form-input pl-9"
            />
          </div>

          {/* Department filter */}
          <select
            value={deptFilter}
            onChange={(e) => {
              setDeptFilter(e.target.value);
              setPage(1);
            }}
            className="form-input w-full sm:w-48"
          >
            <option value="">All Departments</option>
            {departments?.results?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="form-input w-full sm:w-40"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="TERMINATED">Terminated</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={data?.results || []}
        loading={isLoading}
        emptyMessage="No employees found. Add your first employee to get started."
        onRowClick={(row) => navigate(`/employees/${row.id}/edit`)}
      />

      {/* Pagination */}
      {data && data.results && data.results.length > 0 && data.count > data.results.length && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Page {page} of {Math.ceil(data.count / (data.results.length || 1))}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={!data.previous}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={!data.next}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Deactivate confirmation modal */}
      <Modal
        open={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        title="Deactivate Employee"
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setDeactivateTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={deactivateMutation.isPending}
              onClick={() => deactivateMutation.mutate(deactivateTarget?.id)}
            >
              Deactivate
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Are you sure you want to deactivate{" "}
          <strong>{deactivateTarget?.full_name}</strong>? They will no longer
          appear in active payroll runs.
        </p>
      </Modal>

      {/* Import employees modal */}
      <Modal
        open={importModal}
        onClose={handleImportClose}
        title="Import Employees from CSV"
        size="lg"
        footer={
          importResult ? (
            <Button onClick={handleImportClose}>Close</Button>
          ) : (
            <>
              <Button
                variant="secondary"
                onClick={handleImportClose}
              >
                Cancel
              </Button>
              <Button
                loading={importMutation.isPending}
                onClick={handleImportSubmit}
              >
                <DocumentArrowUpIcon className="h-4 w-4" />
                Upload & Import
              </Button>
            </>
          )
        }
      >
        {!importResult ? (
          <div className="space-y-4">
            {/* Instructions + template download */}
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800 space-y-2">
              <p className="font-semibold">How to import employees:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Download the template CSV below.</li>
                <li>Fill in one employee per row — do not remove or rename any columns.</li>
                <li>Rows starting with <code className="bg-blue-100 px-1 rounded">#</code> are instruction notes — you can delete them.</li>
                <li>
                  <strong>department</strong> and <strong>position</strong> must exactly match names
                  already in the system (case-insensitive).
                </li>
                <li>Dates must be <strong>YYYY-MM-DD</strong> (e.g. 1990-05-15).</li>
                <li>Save as <strong>.csv</strong> and upload below.</li>
              </ol>
              <Button
                variant="secondary"
                size="sm"
                loading={templateLoading}
                onClick={handleTemplateDownload}
                className="mt-2"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                Download CSV Template
              </Button>
            </div>

            {/* File picker */}
            <div
              className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <ArrowUpTrayIcon className="h-10 w-10 text-slate-400 mx-auto mb-3" />
              {importFile ? (
                <div>
                  <p className="font-medium text-slate-800">{importFile.name}</p>
                  <p className="text-sm text-slate-500 mt-1">
                    {(importFile.size / 1024).toFixed(1)} KB — click to change
                  </p>
                </div>
              ) : (
                <div>
                  <p className="font-medium text-slate-700">Click to select CSV file</p>
                  <p className="text-sm text-slate-400 mt-1">or drag and drop</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => setImportFile(e.target.files[0] || null)}
              />
            </div>
          </div>
        ) : (
          /* Import result */
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                <p className="text-2xl font-bold text-green-700">{importResult.created}</p>
                <p className="text-sm text-green-600 mt-1">Created</p>
              </div>
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                <p className="text-2xl font-bold text-amber-700">{importResult.skipped_count}</p>
                <p className="text-sm text-amber-600 mt-1">Skipped</p>
              </div>
              <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                <p className="text-2xl font-bold text-red-700">{importResult.errors?.length ?? 0}</p>
                <p className="text-sm text-red-600 mt-1">Errors</p>
              </div>
            </div>

            {importResult.skipped?.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">Skipped rows:</p>
                <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100 text-sm">
                  {importResult.skipped.map((s, i) => (
                    <div key={i} className="px-3 py-2 flex gap-3">
                      <span className="text-slate-500 w-14 shrink-0">Row {s.row}</span>
                      <span className="font-medium text-slate-700">{s.name}</span>
                      <span className="text-slate-400 ml-auto text-xs">{s.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {importResult.errors?.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-red-700 mb-2">Row errors:</p>
                <div className="max-h-40 overflow-y-auto rounded-lg border border-red-200 divide-y divide-red-100 text-sm">
                  {importResult.errors.map((e, i) => (
                    <div key={i} className="px-3 py-2 text-red-700">
                      <span className="font-medium">Row {e.row}:</span> {e.reason}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
