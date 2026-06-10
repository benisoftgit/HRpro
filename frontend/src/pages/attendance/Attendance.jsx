import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import api from "../../api/axios";
import { ATTENDANCE, EMPLOYEES } from "../../api/endpoints";
import { useAuthStore } from "../../store/authStore";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import Input, { Select, Textarea } from "../../components/common/Input";
import { PlusIcon, ArrowUpTrayIcon, DocumentArrowUpIcon } from "@heroicons/react/24/outline";
import { format } from "date-fns";

export default function Attendance() {
  const { role } = useAuthStore();
  const queryClient = useQueryClient();
  const isHROrAdmin = ["ADMIN", "HR"].includes(role);

  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [addModal, setAddModal] = useState(false);
  const [importModal, setImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: { date: format(new Date(), "yyyy-MM-dd"), status: "PRESENT" },
  });

  const params = new URLSearchParams();
  if (dateFilter) params.set("date", dateFilter);
  if (statusFilter) params.set("status", statusFilter);

  const { data, isLoading } = useQuery({
    queryKey: ["attendance", dateFilter, statusFilter],
    queryFn: () =>
      api.get(`${ATTENDANCE.LIST}?${params}`).then((r) => r.data),
  });

  const { data: employees } = useQuery({
    queryKey: ["employees-simple"],
    queryFn: () =>
      api
        .get(EMPLOYEES.LIST + "?employment_status=ACTIVE&page_size=200")
        .then((r) => r.data),
    enabled: isHROrAdmin,
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.post(ATTENDANCE.LIST, data),
    onSuccess: () => {
      toast.success("Attendance recorded.");
      queryClient.invalidateQueries(["attendance"]);
      setAddModal(false);
      reset();
    },
    onError: (err) => {
      const msg =
        err.response?.data?.non_field_errors?.[0] ||
        err.response?.data?.detail ||
        "Failed to record attendance.";
      toast.error(msg);
    },
  });

  const importMutation = useMutation({
    mutationFn: (formData) =>
      api.post(ATTENDANCE.IMPORT, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      }),
    onSuccess: (res) => {
      setImportResult(res.data);
      setDateFilter(""); // clear date filter so imported records are visible
      queryClient.invalidateQueries(["attendance"]);
      toast.success(res.data.detail);
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || "Import failed.";
      toast.error(msg);
    },
  });

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
      key: "employee_name",
      label: "Employee",
      render: (v, row) => (
        <div>
          <p className="font-medium text-slate-900">{v}</p>
          <p className="text-xs text-slate-400">{row.employee_id}</p>
        </div>
      ),
    },
    {
      key: "date",
      label: "Date",
      render: (v) => format(new Date(v), "dd MMM yyyy"),
    },
    {
      key: "clock_in",
      label: "Clock In",
      render: (v) => (v ? v.slice(0, 5) : "—"),
    },
    {
      key: "clock_out",
      label: "Clock Out",
      render: (v) => (v ? v.slice(0, 5) : "—"),
    },
    {
      key: "hours_worked",
      label: "Hours",
      render: (v) => (Number(v) > 0 ? `${v}h` : "—"),
    },
    {
      key: "overtime_hours",
      label: "OT Hours",
      render: (v) =>
        Number(v) > 0 ? (
          <span className="text-accent-600 font-medium">{v}h</span>
        ) : (
          "—"
        ),
    },
    {
      key: "status",
      label: "Status",
      render: (v) => <Badge status={v} />,
    },
    {
      key: "notes",
      label: "Notes",
      render: (v) => (
        <span className="text-xs text-slate-400 truncate max-w-xs block">
          {v || "—"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Attendance</h2>
          <p className="text-sm text-slate-500">
            {data?.count ?? 0} records
          </p>
        </div>
        {isHROrAdmin && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setImportModal(true)}>
              <ArrowUpTrayIcon className="h-4 w-4" />
              Import CSV
            </Button>
            <Button onClick={() => setAddModal(true)}>
              <PlusIcon className="h-4 w-4" />
              Record Attendance
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="card !p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            containerClassName="flex-1"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-input w-full sm:w-40"
          >
            <option value="">All Statuses</option>
            <option value="PRESENT">Present</option>
            <option value="ABSENT">Absent</option>
            <option value="LATE">Late</option>
            <option value="HALF_DAY">Half Day</option>
            <option value="HOLIDAY">Public Holiday</option>
            <option value="WEEKEND">Weekend</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={data?.results || []}
        loading={isLoading}
        emptyMessage={dateFilter ? "No attendance records for this date." : "No attendance records found. Import a CSV or record manually."}
      />

      {/* Add attendance modal */}
      <Modal
        open={addModal}
        onClose={() => {
          setAddModal(false);
          reset();
        }}
        title="Record Attendance"
        size="md"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setAddModal(false);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button
              loading={createMutation.isPending}
              onClick={handleSubmit((data) => createMutation.mutate(data))}
            >
              Save Record
            </Button>
          </>
        }
      >
        <div className="space-y-4">
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

          <Input
            label="Date"
            type="date"
            required
            error={errors.date?.message}
            {...register("date", { required: "Date is required" })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Clock In"
              type="time"
              {...register("clock_in")}
            />
            <Input
              label="Clock Out"
              type="time"
              {...register("clock_out")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Status"
              required
              error={errors.status?.message}
              {...register("status", { required: "Status is required" })}
            >
              <option value="PRESENT">Present</option>
              <option value="ABSENT">Absent</option>
              <option value="LATE">Late</option>
              <option value="HALF_DAY">Half Day</option>
              <option value="HOLIDAY">Public Holiday</option>
            </Select>
            <Input
              label="Overtime Hours"
              type="number"
              step="0.5"
              min="0"
              defaultValue="0"
              {...register("overtime_hours")}
            />
          </div>

          <Textarea
            label="Notes"
            rows={2}
            {...register("notes")}
          />
        </div>
      </Modal>
      {/* Import CSV modal */}
      <Modal
        open={importModal}
        onClose={handleImportClose}
        title="Import Attendance from CSV"
        size="lg"
        footer={
          importResult ? (
            <Button onClick={handleImportClose}>Close</Button>
          ) : (
            <>
              <Button variant="secondary" onClick={handleImportClose}>
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
            {/* Instructions */}
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800 space-y-1">
              <p className="font-semibold">Expected CSV format (TSEL ATT Report style):</p>
              <p>Columns: <code className="bg-blue-100 px-1 rounded">Badge No. | Name | Date | Clock In | Clock Out | Late | Early | Absent | Work Time</code></p>
              <p>• Employees are matched by Badge No. (e.g. badge <strong>1</strong> → <strong>EMP001</strong>)</p>
              <p>• Existing records for the same employee + date will be <strong>updated</strong></p>
              <p>• Dates should be in <strong>M/D/YYYY</strong> format (e.g. 2/3/2026)</p>
              <p>• Time values in <strong>HH:MM</strong> (e.g. 08:30)</p>
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
          /* Import result summary */
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                <p className="text-2xl font-bold text-green-700">{importResult.created}</p>
                <p className="text-sm text-green-600 mt-1">Created</p>
              </div>
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                <p className="text-2xl font-bold text-blue-700">{importResult.updated}</p>
                <p className="text-sm text-blue-600 mt-1">Updated</p>
              </div>
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                <p className="text-2xl font-bold text-amber-700">{importResult.skipped_count}</p>
                <p className="text-sm text-amber-600 mt-1">Skipped</p>
              </div>
            </div>

            {importResult.skipped?.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">
                  Skipped rows (badge not matched):
                </p>
                <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
                  {importResult.skipped.map((s, i) => (
                    <div key={i} className="px-3 py-2 text-sm flex gap-3">
                      <span className="font-mono text-slate-500 w-16">Badge {s.badge}</span>
                      <span className="text-slate-700">{s.name}</span>
                      <span className="text-slate-400 ml-auto">{s.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {importResult.errors?.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-red-700 mb-2">Row errors:</p>
                <div className="max-h-32 overflow-y-auto rounded-lg border border-red-200 divide-y divide-red-100">
                  {importResult.errors.map((e, i) => (
                    <div key={i} className="px-3 py-2 text-sm text-red-700">
                      Row {e.row}: {e.reason}
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
