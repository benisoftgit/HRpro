import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import api from "../../api/axios";
import { AUTH, EMPLOYEES, LEAVE, SALARY } from "../../api/endpoints";
import { useAuthStore } from "../../store/authStore";
import Button from "../../components/common/Button";
import Input, { Select, Textarea } from "../../components/common/Input";
import Modal from "../../components/common/Modal";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import {
  UserCircleIcon,
  LockClosedIcon,
  UsersIcon,
  CalendarDaysIcon,
  BanknotesIcon,
  CurrencyDollarIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

const TABS = [
  { key: "profile", label: "My Profile", icon: UserCircleIcon },
  { key: "password", label: "Change Password", icon: LockClosedIcon },
  { key: "users", label: "User Accounts", icon: UsersIcon },
  { key: "user-approval", label: "User Approval", icon: CheckCircleIcon },
  { key: "password-resets", label: "Password Resets", icon: LockClosedIcon },
  { key: "leave-types", label: "Leave Types", icon: CalendarDaysIcon },
  { key: "allowance-types", label: "Allowance Types", icon: BanknotesIcon },
  { key: "employee-allowances", label: "Employee Allowances", icon: CurrencyDollarIcon },
  { key: "payroll", label: "Payroll Settings", icon: CurrencyDollarIcon },
];

export default function Settings() {
  const [tab, setTab] = useState("profile");
  const { user, updateUser } = useAuthStore();

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Settings</h2>
        <p className="text-sm text-slate-500">Manage system configuration and your account</p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Sidebar tabs */}
        <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:w-52 flex-shrink-0">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                tab === key
                  ? "bg-primary-50 text-primary-700"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        {/* Tab content */}
        <div className="flex-1 min-w-0">
          {tab === "profile" && <ProfileTab user={user} updateUser={updateUser} />}
          {tab === "password" && <PasswordTab />}
          {tab === "users" && <UsersTab />}
          {tab === "user-approval" && <UserApprovalTab />}
          {tab === "password-resets" && <PasswordResetsTab />}
          {tab === "leave-types" && <LeaveTypesTab />}
          {tab === "allowance-types" && <AllowanceTypesTab />}
          {tab === "employee-allowances" && <EmployeeAllowancesTab />}
          {tab === "payroll" && <PayrollTab />}
        </div>
      </div>
    </div>
  );
}

// ── Profile Tab ──────────────────────────────────────────────────────────────
function ProfileTab({ user, updateUser }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      first_name: user?.first_name || "",
      last_name: user?.last_name || "",
      phone: user?.phone || "",
    },
  });

  const mutation = useMutation({
    mutationFn: (data) => api.put(AUTH.PROFILE, data),
    onSuccess: (res) => {
      updateUser(res.data);
      toast.success("Profile updated.");
    },
    onError: () => toast.error("Failed to update profile."),
  });

  return (
    <div className="card max-w-lg">
      <h3 className="text-base font-semibold text-slate-900 mb-4">My Profile</h3>
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="First Name"
            required
            error={errors.first_name?.message}
            {...register("first_name", { required: "Required" })}
          />
          <Input
            label="Last Name"
            required
            error={errors.last_name?.message}
            {...register("last_name", { required: "Required" })}
          />
        </div>
        <Input label="Email" value={user?.email || ""} disabled />
        <Input label="Phone" placeholder="+233 XX XXX XXXX" {...register("phone")} />
        <div className="pt-2">
          <Button type="submit" loading={mutation.isPending}>Save Profile</Button>
        </div>
      </form>
    </div>
  );
}

// ── Password Tab ─────────────────────────────────────────────────────────────
function PasswordTab() {
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const mutation = useMutation({
    mutationFn: (data) => api.post(AUTH.CHANGE_PASSWORD, data),
    onSuccess: () => {
      toast.success("Password changed successfully.");
      reset();
    },
    onError: (err) => {
      const msg = err.response?.data?.old_password?.[0] ||
        err.response?.data?.new_password?.[0] ||
        err.response?.data?.detail || "Failed to change password.";
      toast.error(msg);
    },
  });

  return (
    <div className="card max-w-lg">
      <h3 className="text-base font-semibold text-slate-900 mb-4">Change Password</h3>
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
        <Input
          label="Current Password"
          type="password"
          required
          error={errors.old_password?.message}
          {...register("old_password", { required: "Required" })}
        />
        <Input
          label="New Password"
          type="password"
          required
          error={errors.new_password?.message}
          {...register("new_password", { required: "Required", minLength: { value: 8, message: "Min 8 characters" } })}
        />
        <Input
          label="Confirm New Password"
          type="password"
          required
          error={errors.confirm_password?.message}
          {...register("confirm_password", { required: "Required" })}
        />
        <div className="pt-2">
          <Button type="submit" loading={mutation.isPending}>Change Password</Button>
        </div>
      </form>
    </div>
  );
}

// ── Users Tab ────────────────────────────────────────────────────────────────
function UsersTab() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const { data, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.get(AUTH.USERS).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.post(AUTH.USERS, data),
    onSuccess: () => {
      toast.success("User account created.");
      queryClient.invalidateQueries(["users"]);
      setModal(false);
      reset();
    },
    onError: (err) => {
      const msg = err.response?.data?.email?.[0] || err.response?.data?.detail || "Failed to create user.";
      toast.error(msg);
    },
  });

  const columns = [
    {
      key: "full_name",
      label: "Name",
      render: (v, row) => (
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold">
            {row.first_name?.[0]}{row.last_name?.[0]}
          </div>
          <span className="font-medium text-slate-900">{v}</span>
        </div>
      ),
    },
    { key: "email", label: "Email" },
    {
      key: "role",
      label: "Role",
      render: (v) => {
        const colors = { ADMIN: "bg-purple-100 text-purple-700", HR: "bg-blue-100 text-blue-700", FINANCE: "bg-green-100 text-green-700", MANAGER: "bg-amber-100 text-amber-700", MD: "bg-rose-100 text-rose-700", EMPLOYEE: "bg-slate-100 text-slate-600" };
        return <span className={`badge ${colors[v] || "bg-slate-100 text-slate-600"}`}>{v}</span>;
      },
    },
    {
      key: "is_active",
      label: "Status",
      render: (v) => <Badge status={v ? "ACTIVE" : "INACTIVE"} />,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900">User Accounts</h3>
        <Button onClick={() => setModal(true)}>
          <PlusIcon className="h-4 w-4" />
          Add User
        </Button>
      </div>

      <Table
        columns={columns}
        data={data?.results || data || []}
        loading={isLoading}
        emptyMessage="No user accounts found."
      />

      <Modal
        open={modal}
        onClose={() => { setModal(false); reset(); }}
        title="Create User Account"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setModal(false); reset(); }}>Cancel</Button>
            <Button loading={createMutation.isPending} onClick={handleSubmit((d) => createMutation.mutate(d))}>
              Create Account
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name" required error={errors.first_name?.message}
              {...register("first_name", { required: "Required" })} />
            <Input label="Last Name" required error={errors.last_name?.message}
              {...register("last_name", { required: "Required" })} />
          </div>
          <Input label="Email Address" type="email" required error={errors.email?.message}
            {...register("email", { required: "Required" })} />
          <Select label="Role" required error={errors.role?.message}
            {...register("role", { required: "Required" })}>
            <option value="">Select role</option>
            <option value="ADMIN">Admin</option>
            <option value="HR">HR Manager</option>
            <option value="FINANCE">Finance Officer</option>
            <option value="MANAGER">Line Manager</option>
            <option value="MD">Managing Director</option>
            <option value="EMPLOYEE">Employee</option>
          </Select>
          <Input label="Phone" {...register("phone")} />
          <Input label="Password" type="password" required error={errors.password?.message}
            hint="Minimum 8 characters"
            {...register("password", { required: "Required", minLength: { value: 8, message: "Min 8 characters" } })} />
        </div>
      </Modal>
    </div>
  );
}

// ── User Approval Tab ─────────────────────────────────────────────────────────
function UserApprovalTab() {
  const queryClient = useQueryClient();
  const [confirmReject, setConfirmReject] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["pending-approvals"],
    queryFn: () => api.get(AUTH.PENDING_APPROVALS).then((r) => r.data),
  });

  const approveMutation = useMutation({
    mutationFn: (userId) => api.post(AUTH.APPROVE_USER(userId), { action: "approve" }),
    onSuccess: () => {
      toast.success("User approved.");
      queryClient.invalidateQueries(["pending-approvals", "users"]);
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Failed to approve."),
  });

  const rejectMutation = useMutation({
    mutationFn: (userId) => api.post(AUTH.APPROVE_USER(userId), { action: "reject" }),
    onSuccess: () => {
      toast.success("User registration rejected.");
      setConfirmReject(null);
      queryClient.invalidateQueries(["pending-approvals", "users"]);
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Failed to reject."),
  });

  const users = data?.results || data || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Pending Approvals</h3>
          <p className="text-sm text-slate-500">
            Review and approve new user registrations
          </p>
        </div>
        <Badge status={users.length === 0 ? "ACTIVE" : "PENDING"}>
          {users.length} pending
        </Badge>
      </div>

      {isLoading ? (
        <div className="text-sm text-slate-500 py-8 text-center">Loading...</div>
      ) : users.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-slate-200 p-8 text-center">
          <CheckCircleIcon className="mx-auto h-10 w-10 text-green-400" />
          <p className="mt-2 text-sm font-medium text-slate-700">No pending approvals</p>
          <p className="text-xs text-slate-500">
            All user registrations have been reviewed.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((u) => (
            <div
              key={u.id}
              className="rounded-lg border border-slate-200 bg-white p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-semibold">
                  {u.first_name?.[0]}{u.last_name?.[0]}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {u.first_name} {u.last_name}
                  </p>
                  <p className="text-xs text-slate-500">{u.email}</p>
                  <p className="text-xs text-slate-400">
                    Registered {new Date(u.date_joined).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => approveMutation.mutate(u.id)}
                  loading={approveMutation.isPending}
                >
                  <CheckCircleIcon className="h-4 w-4" />
                  Approve
                </Button>
                {confirmReject === u.id ? (
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => rejectMutation.mutate(u.id)}
                      loading={rejectMutation.isPending}
                    >
                      Confirm
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setConfirmReject(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setConfirmReject(u.id)}
                  >
                    <XCircleIcon className="h-4 w-4" />
                    Reject
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Password Resets Tab ───────────────────────────────────────────────────────
function PasswordResetsTab() {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const [resolveModal, setResolveModal] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["password-reset-requests"],
    queryFn: () =>
      api.get(AUTH.PASSWORD_RESET_LIST + "?status=PENDING").then((r) => r.data),
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, data }) => api.post(AUTH.PASSWORD_RESET_RESOLVE(id), data),
    onSuccess: () => {
      toast.success("Password reset request resolved.");
      queryClient.invalidateQueries(["password-reset-requests"]);
      setResolveModal(null);
      reset();
    },
    onError: (err) =>
      toast.error(err.response?.data?.detail || err.response?.data?.new_password?.[0] || "Failed to resolve."),
  });

  const requests = data?.results || data || [];

  const pendingResolve = resolveModal
    ? requests.find((r) => r.id === resolveModal)
    : null;

  const onResolve = (formData) => {
    resolveMutation.mutate({
      id: resolveModal,
      data: { action: "approve", new_password: formData.new_password },
    });
  };

  const onReject = (id) => {
    resolveMutation.mutate({
      id,
      data: { action: "reject" },
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-slate-900">Password Reset Requests</h3>
        <p className="text-sm text-slate-500">
          Review and fulfill employee password reset requests
        </p>
      </div>

      <Table
        columns={[
          {
            key: "user_name",
            label: "Employee",
            render: (v, row) => (
              <div>
                <span className="font-medium text-slate-900">{v}</span>
                <span className="block text-xs text-slate-500">{row.user_email}</span>
              </div>
            ),
          },
          {
            key: "notes",
            label: "Notes",
            render: (v) => (
              <span className="text-sm text-slate-600">{v || "—"}</span>
            ),
          },
          {
            key: "requested_at",
            label: "Requested",
            render: (v) => (
              <span className="text-sm text-slate-600">
                {new Date(v).toLocaleDateString()}
              </span>
            ),
          },
          {
            key: "id",
            label: "",
            render: (v) => (
              <div className="flex items-center gap-2 justify-end">
                <Button
                  size="sm"
                  onClick={() => setResolveModal(v)}
                >
                  <CheckCircleIcon className="h-4 w-4" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onReject(v)}
                  loading={resolveMutation.isPending}
                >
                  <XCircleIcon className="h-4 w-4" />
                  Reject
                </Button>
              </div>
            ),
          },
        ]}
        data={requests}
        loading={isLoading}
        emptyMessage="No pending password reset requests."
      />

      <Modal
        open={!!resolveModal}
        onClose={() => { setResolveModal(null); reset(); }}
        title="Approve Password Reset"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setResolveModal(null); reset(); }}>
              Cancel
            </Button>
            <Button
              loading={resolveMutation.isPending}
              onClick={handleSubmit(onResolve)}
            >
              Set New Password
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {pendingResolve && (
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm">
              <p className="font-medium text-slate-900">{pendingResolve.user_name}</p>
              <p className="text-slate-500">{pendingResolve.user_email}</p>
            </div>
          )}
          <Input
            label="New Password"
            type="password"
            required
            hint="Minimum 8 characters"
            error={errors.new_password?.message}
            {...register("new_password", {
              required: "New password is required",
              minLength: { value: 8, message: "Min 8 characters" },
            })}
          />
        </div>
      </Modal>
    </div>
  );
}

// ── Leave Types Tab ──────────────────────────────────────────────────────────
function LeaveTypesTab() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const { data, isLoading } = useQuery({
    queryKey: ["leave-types"],
    queryFn: () => api.get(LEAVE.TYPES + "?page_size=50").then((r) => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: (data) =>
      editing ? api.put(LEAVE.TYPE(editing.id), data) : api.post(LEAVE.TYPES, data),
    onSuccess: () => {
      toast.success(editing ? "Leave type updated." : "Leave type created.");
      queryClient.invalidateQueries(["leave-types"]);
      closeModal();
    },
    onError: () => toast.error("Failed to save leave type."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(LEAVE.TYPE(id)),
    onSuccess: () => { toast.success("Leave type deleted."); queryClient.invalidateQueries(["leave-types"]); },
    onError: () => toast.error("Cannot delete — leave type may be in use."),
  });

  const openModal = (lt = null) => {
    setEditing(lt);
    reset(lt ? { name: lt.name, days_allowed: lt.days_allowed, is_paid: lt.is_paid, description: lt.description } : {});
    setModal(true);
  };

  const closeModal = () => { setModal(false); setEditing(null); reset(); };

  const columns = [
    { key: "name", label: "Leave Type", render: (v) => <span className="font-medium">{v}</span> },
    { key: "days_allowed", label: "Days/Year" },
    { key: "is_paid", label: "Paid", render: (v) => <Badge status={v ? "ACTIVE" : "INACTIVE"} label={v ? "Paid" : "Unpaid"} /> },
    {
      key: "id", label: "Actions",
      render: (v, row) => (
        <div className="flex gap-1">
          <button onClick={() => openModal(row)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-primary-600"><PencilSquareIcon className="h-4 w-4" /></button>
          <button onClick={() => { if (window.confirm(`Delete "${row.name}"?`)) deleteMutation.mutate(v); }} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><TrashIcon className="h-4 w-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900">Leave Types</h3>
        <Button onClick={() => openModal()}><PlusIcon className="h-4 w-4" />Add Leave Type</Button>
      </div>
      <Table columns={columns} data={data?.results || data || []} loading={isLoading} emptyMessage="No leave types." />
      <Modal open={modal} onClose={closeModal} title={editing ? "Edit Leave Type" : "Add Leave Type"} size="md"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button loading={saveMutation.isPending} onClick={handleSubmit((d) => saveMutation.mutate(d))}>
              {editing ? "Save Changes" : "Create"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Leave Type Name" required placeholder="e.g. Annual Leave"
            error={errors.name?.message} {...register("name", { required: "Required" })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Days Allowed Per Year" type="number" min="1" required
              error={errors.days_allowed?.message} {...register("days_allowed", { required: "Required", min: 1 })} />
            <Select label="Type" {...register("is_paid")}>
              <option value="true">Paid</option>
              <option value="false">Unpaid</option>
            </Select>
          </div>
          <Textarea label="Description" rows={2} {...register("description")} />
        </div>
      </Modal>
    </div>
  );
}

// ── Allowance Types Tab ──────────────────────────────────────────────────────
function AllowanceTypesTab() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const { data, isLoading } = useQuery({
    queryKey: ["allowance-types"],
    queryFn: () => api.get(SALARY.ALLOWANCE_TYPES + "?page_size=50").then((r) => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: (data) =>
      editing ? api.put(SALARY.ALLOWANCE_TYPE(editing.id), data) : api.post(SALARY.ALLOWANCE_TYPES, data),
    onSuccess: () => {
      toast.success(editing ? "Allowance type updated." : "Allowance type created.");
      queryClient.invalidateQueries(["allowance-types"]);
      closeModal();
    },
    onError: () => toast.error("Failed to save allowance type."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(SALARY.ALLOWANCE_TYPE(id)),
    onSuccess: () => { toast.success("Deleted."); queryClient.invalidateQueries(["allowance-types"]); },
    onError: () => toast.error("Cannot delete — may be in use."),
  });

  const openModal = (at = null) => {
    setEditing(at);
    reset(at ? { name: at.name, is_taxable: at.is_taxable, is_fixed: at.is_fixed, description: at.description } : {});
    setModal(true);
  };

  const closeModal = () => { setModal(false); setEditing(null); reset(); };

  const columns = [
    { key: "name", label: "Allowance Type", render: (v) => <span className="font-medium">{v}</span> },
    { key: "is_taxable", label: "Taxable", render: (v) => <Badge status={v ? "ACTIVE" : "INACTIVE"} label={v ? "Taxable" : "Non-taxable"} /> },
    { key: "is_fixed", label: "Amount Type", render: (v) => <span className="text-sm text-slate-600">{v ? "Fixed" : "Variable"}</span> },
    {
      key: "id", label: "Actions",
      render: (v, row) => (
        <div className="flex gap-1">
          <button onClick={() => openModal(row)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-primary-600"><PencilSquareIcon className="h-4 w-4" /></button>
          <button onClick={() => { if (window.confirm(`Delete "${row.name}"?`)) deleteMutation.mutate(v); }} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><TrashIcon className="h-4 w-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900">Allowance Types</h3>
        <Button onClick={() => openModal()}><PlusIcon className="h-4 w-4" />Add Allowance Type</Button>
      </div>
      <Table columns={columns} data={data?.results || data || []} loading={isLoading} emptyMessage="No allowance types yet." />
      <Modal open={modal} onClose={closeModal} title={editing ? "Edit Allowance Type" : "Add Allowance Type"} size="md"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button loading={saveMutation.isPending} onClick={handleSubmit((d) => saveMutation.mutate(d))}>
              {editing ? "Save Changes" : "Create"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Allowance Name" required placeholder="e.g. Housing Allowance"
            error={errors.name?.message} {...register("name", { required: "Required" })} />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Taxable?" {...register("is_taxable")}>
              <option value="false">Non-taxable</option>
              <option value="true">Taxable</option>
            </Select>
            <Select label="Amount Type" {...register("is_fixed")}>
              <option value="true">Fixed Amount</option>
              <option value="false">Variable Amount</option>
            </Select>
          </div>
          <Textarea label="Description" rows={2} {...register("description")} />
        </div>
      </Modal>
    </div>
  );
}

// ── Employee Allowances Tab ───────────────────────────────────────────────────
function EmployeeAllowancesTab() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const { data, isLoading } = useQuery({
    queryKey: ["employee-allowances"],
    queryFn: () => api.get(SALARY.ALLOWANCES + "?page_size=200").then((r) => r.data),
  });

  const { data: employees } = useQuery({
    queryKey: ["employees-list"],
    queryFn: () => api.get(EMPLOYEES.LIST + "?page_size=200").then((r) => r.data),
  });

  const { data: allowanceTypes } = useQuery({
    queryKey: ["allowance-types"],
    queryFn: () => api.get(SALARY.ALLOWANCE_TYPES + "?page_size=100").then((r) => r.data),
  });

  const empList = employees?.results || employees || [];
  const atList = allowanceTypes?.results || allowanceTypes || [];

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      editing
        ? api.put(SALARY.ALLOWANCE(editing.id), payload)
        : api.post(SALARY.ALLOWANCES, payload),
    onSuccess: () => {
      toast.success(editing ? "Allowance updated." : "Allowance assigned.");
      queryClient.invalidateQueries(["employee-allowances"]);
      closeModal();
    },
    onError: () => toast.error("Failed to save allowance."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(SALARY.ALLOWANCE(id)),
    onSuccess: () => { toast.success("Deleted."); queryClient.invalidateQueries(["employee-allowances"]); },
    onError: () => toast.error("Cannot delete."),
  });

  const openModal = (ea = null) => {
    setEditing(ea);
    reset(ea ? {
      employee: ea.employee,
      allowance_type: ea.allowance_type,
      amount: ea.amount,
      effective_date: ea.effective_date,
      is_active: ea.is_active,
      notes: ea.notes || "",
    } : { is_active: "true" });
    setModal(true);
  };

  const closeModal = () => { setModal(false); setEditing(null); reset(); };

  const columns = [
    {
      key: "employee_name",
      label: "Employee",
      render: (v) => <span className="font-medium text-slate-900">{v}</span>,
    },
    {
      key: "allowance_name",
      label: "Allowance",
      render: (v) => <span>{v}</span>,
    },
    {
      key: "amount",
      label: "Amount (GHS)",
      render: (v) => (
        <span className="font-semibold text-green-700">
          {Number(v).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: "is_taxable",
      label: "Taxable",
      render: (v) => <Badge status={v ? "ACTIVE" : "INACTIVE"} label={v ? "Yes" : "No"} />,
    },
    {
      key: "effective_date",
      label: "Effective",
      render: (v) => <span className="text-sm text-slate-600">{v ? new Date(v).toLocaleDateString() : "—"}</span>,
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
        <div className="flex gap-1">
          <button onClick={() => openModal(row)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-primary-600"><PencilSquareIcon className="h-4 w-4" /></button>
          <button onClick={() => { if (window.confirm(`Remove this allowance?`)) deleteMutation.mutate(v); }} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><TrashIcon className="h-4 w-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Employee Allowances</h3>
          <p className="text-sm text-slate-500">Assign allowance types to specific employees</p>
        </div>
        <Button onClick={() => openModal()}><PlusIcon className="h-4 w-4" />Assign Allowance</Button>
      </div>

      <Table
        columns={columns}
        data={data?.results || data || []}
        loading={isLoading}
        emptyMessage="No employee allowances assigned yet."
      />

      <Modal
        open={modal}
        onClose={closeModal}
        title={editing ? "Edit Employee Allowance" : "Assign Allowance"}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button loading={saveMutation.isPending} onClick={handleSubmit((d) => saveMutation.mutate({
              ...d,
              amount: parseFloat(d.amount),
              is_active: d.is_active === "true" || d.is_active === true,
            }))}>
              {editing ? "Save Changes" : "Assign"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select label="Employee" required error={errors.employee?.message}
            {...register("employee", { required: "Required" })}>
            <option value="">Select employee</option>
            {empList.map((e) => (
              <option key={e.id} value={e.id}>{e.full_name} ({e.employee_id})</option>
            ))}
          </Select>
          <Select label="Allowance Type" required error={errors.allowance_type?.message}
            {...register("allowance_type", { required: "Required" })}>
            <option value="">Select type</option>
            {atList.map((at) => (
              <option key={at.id} value={at.id}>{at.name}</option>
            ))}
          </Select>
          <Input label="Amount (GHS)" type="number" step="0.01" min="0" required
            error={errors.amount?.message}
            {...register("amount", { required: "Required", min: { value: 0, message: "Must be 0 or more" } })} />
          <Input label="Effective Date" type="date" required
            error={errors.effective_date?.message}
            {...register("effective_date", { required: "Required" })} />
          <Select label="Active" {...register("is_active")}>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </Select>
          <Textarea label="Notes" rows={2} {...register("notes")} />
        </div>
      </Modal>
    </div>
  );
}

// ── Payroll Settings Tab ──────────────────────────────────────────────────────
function PayrollTab() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const canEdit = user?.role === "ADMIN" || user?.role === "FINANCE";
  const isAdmin = user?.role === "ADMIN";

  // ── Business Profile ────────────────────────────────────────────
  const { data: bizProfile, isLoading: bizLoading } = useQuery({
    queryKey: ["business-profile"],
    queryFn: () => api.get(SALARY.BUSINESS_PROFILE).then((r) => r.data),
  });

  const {
    register: regBiz,
    handleSubmit: handleBiz,
    reset: resetBiz,
    formState: { errors: errBiz },
  } = useForm();

  useEffect(() => {
    if (!bizProfile) return;
    resetBiz({
      company_name: bizProfile.company_name || "",
      address: bizProfile.address || "",
      phone: bizProfile.phone || "",
      email: bizProfile.email || "",
      website: bizProfile.website || "",
      tin_number: bizProfile.tin_number || "",
      ssnit_number: bizProfile.ssnit_number || "",
    });
  }, [bizProfile, resetBiz]);

  const bizMutation = useMutation({
    mutationFn: (data) => api.put(SALARY.BUSINESS_PROFILE, data),
    onSuccess: () => {
      toast.success("Business profile updated.");
      queryClient.invalidateQueries(["business-profile"]);
    },
    onError: () => toast.error("Failed to update business profile."),
  });

  // ── Statutory Rates ──────────────────────────────────────────────
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["payroll-settings"],
    queryFn: () => api.get(SALARY.PAYROLL_SETTINGS).then((r) => r.data),
  });

  const {
    register: regS,
    handleSubmit: handleS,
    reset: resetS,
    formState: { errors: errS },
  } = useForm();

  useEffect(() => {
    if (!settings) return;
    resetS({
      ssnit_employee: (parseFloat(settings.ssnit_employee_rate) * 100).toFixed(1),
      ssnit_employer: (parseFloat(settings.ssnit_employer_rate) * 100).toFixed(1),
      tier2_employer: (parseFloat(settings.tier2_employer_rate) * 100).toFixed(1),
      tier3_employee: (parseFloat(settings.tier3_employee_rate) * 100).toFixed(1),
      tier3_employer: (parseFloat(settings.tier3_employer_rate) * 100).toFixed(1),
      working_days: settings.working_days_per_month,
      working_hours: settings.working_hours_per_day,
    });
  }, [settings, resetS]);

  const settingsMutation = useMutation({
    mutationFn: (data) =>
      api.put(SALARY.PAYROLL_SETTINGS, {
        ssnit_employee_rate: parseFloat(data.ssnit_employee) / 100,
        ssnit_employer_rate: parseFloat(data.ssnit_employer) / 100,
        tier2_employer_rate: parseFloat(data.tier2_employer) / 100,
        tier3_employee_rate: parseFloat(data.tier3_employee) / 100,
        tier3_employer_rate: parseFloat(data.tier3_employer) / 100,
        working_days_per_month: parseInt(data.working_days, 10),
        working_hours_per_day: parseInt(data.working_hours, 10),
      }),
    onSuccess: () => {
      toast.success("Payroll settings updated.");
      queryClient.invalidateQueries(["payroll-settings"]);
    },
    onError: () => toast.error("Failed to update settings."),
  });

  // ── PAYE Tax Bands ──────────────────────────────────────────────
  const { data: bands, isLoading: bandsLoading } = useQuery({
    queryKey: ["paye-bands"],
    queryFn: () => api.get(SALARY.PAYE_BANDS).then((r) => r.data),
  });

  const [bandModal, setBandModal] = useState(false);
  const [editingBand, setEditingBand] = useState(null);
  const {
    register: regB,
    handleSubmit: handleB,
    reset: resetB,
    formState: { errors: errB },
  } = useForm();

  const saveBandMutation = useMutation({
    mutationFn: (data) => {
      const payload = {
        order: parseInt(data.order, 10),
        rate: parseFloat(data.rate) / 100,
        description: data.description || "",
        annual_limit: data.annual_limit ? parseFloat(data.annual_limit) : null,
      };
      return editingBand
        ? api.put(SALARY.PAYE_BAND(editingBand.id), payload)
        : api.post(SALARY.PAYE_BANDS, payload);
    },
    onSuccess: () => {
      toast.success(editingBand ? "Tax band updated." : "Tax band created.");
      queryClient.invalidateQueries(["paye-bands"]);
      closeBandModal();
    },
    onError: () => toast.error("Failed to save tax band."),
  });

  const deleteBandMutation = useMutation({
    mutationFn: (id) => api.delete(SALARY.PAYE_BAND(id)),
    onSuccess: () => { toast.success("Tax band deleted."); queryClient.invalidateQueries(["paye-bands"]); },
    onError: () => toast.error("Cannot delete — tax band may be in use."),
  });

  const openBandModal = (band = null) => {
    setEditingBand(band);
    resetB(
      band
        ? {
            order: band.order,
            rate: band.rate_percent.toFixed(1),
            annual_limit: band.annual_limit || "",
            description: band.description || "",
          }
        : { order: "", rate: "", annual_limit: "", description: "" }
    );
    setBandModal(true);
  };

  const closeBandModal = () => { setBandModal(false); setEditingBand(null); resetB(); };

  const bandColumns = [
    { key: "order", label: "#", render: (v) => <span className="font-medium">{v}</span> },
    {
      key: "annual_limit",
      label: "Annual Limit (GHS)",
      render: (v) => (v ? `GHS ${Number(v).toLocaleString()}` : <span className="text-slate-400">Above</span>),
    },
    { key: "rate_percent", label: "Rate", render: (v) => `${v}%` },
    { key: "description", label: "Description" },
    {
      key: "id",
      label: "Actions",
      render: (v, row) =>
        canEdit ? (
          <div className="flex gap-1">
            <button onClick={() => openBandModal(row)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-primary-600"><PencilSquareIcon className="h-4 w-4" /></button>
            <button onClick={() => { if (window.confirm(`Delete Band ${row.order}?`)) deleteBandMutation.mutate(v); }} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><TrashIcon className="h-4 w-4" /></button>
          </div>
        ) : null,
    },
  ];

  const bandListData = Array.isArray(bands) ? bands : bands?.results || [];

  return (
    <div className="space-y-6">
      {/* ── Business Profile Card ─────────────────────────────── */}
      <div className="card">
        <h3 className="text-base font-semibold text-slate-900 mb-4">
          Business Profile
          {!isAdmin && <span className="ml-2 text-xs font-normal text-slate-400">(view only)</span>}
        </h3>
        {bizLoading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : (
          <form onSubmit={handleBiz((d) => bizMutation.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Company Name" required disabled={!isAdmin}
                error={errBiz.company_name?.message} {...regBiz("company_name", { required: "Required" })} />
              <Input label="Phone" disabled={!isAdmin}
                {...regBiz("phone")} />
              <Input label="Email" type="email" disabled={!isAdmin}
                {...regBiz("email")} />
              <Input label="Website" disabled={!isAdmin}
                {...regBiz("website")} />
              <Input label="TIN (Tax ID)" disabled={!isAdmin}
                {...regBiz("tin_number")} />
              <Input label="SSNIT Employer No." disabled={!isAdmin}
                {...regBiz("ssnit_number")} />
            </div>
            <Input label="Registered Address" disabled={!isAdmin}
              {...regBiz("address")} />
            {isAdmin && (
              <div className="pt-2">
                <Button type="submit" loading={bizMutation.isPending}>Save Business Profile</Button>
              </div>
            )}
          </form>
        )}
      </div>

      {/* ── Statutory Rates Card ──────────────────────────────── */}
      <div className="card">
        <h3 className="text-base font-semibold text-slate-900 mb-4">
          Statutory Contribution Rates
          {!canEdit && <span className="ml-2 text-xs font-normal text-slate-400">(view only)</span>}
        </h3>
        {settingsLoading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : (
          <form onSubmit={handleS((d) => settingsMutation.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Input label="SSNIT Employee (%)" type="number" step="0.1" disabled={!canEdit}
                hint="Default 5.5%" error={errS.ssnit_employee?.message} {...regS("ssnit_employee", { required: "Required" })} />
              <Input label="SSNIT Employer (%)" type="number" step="0.1" disabled={!canEdit}
                hint="Default 13.0%" error={errS.ssnit_employer?.message} {...regS("ssnit_employer", { required: "Required" })} />
              <Input label="Tier 2 — Employer (%)" type="number" step="0.1" disabled={!canEdit}
                hint="Default 5.0%" error={errS.tier2_employer?.message} {...regS("tier2_employer", { required: "Required" })} />
              <Input label="Tier 3 — Employee (%)" type="number" step="0.1" disabled={!canEdit}
                hint="Optional" error={errS.tier3_employee?.message} {...regS("tier3_employee")} />
              <Input label="Tier 3 — Employer (%)" type="number" step="0.1" disabled={!canEdit}
                hint="Optional" error={errS.tier3_employer?.message} {...regS("tier3_employer")} />
              <Input label="Working Days / Month" type="number" disabled={!canEdit}
                hint="Default 22" error={errS.working_days?.message} {...regS("working_days", { required: "Required" })} />
              <Input label="Working Hours / Day" type="number" disabled={!canEdit}
                hint="Default 8" error={errS.working_hours?.message} {...regS("working_hours", { required: "Required" })} />
            </div>
            {canEdit && (
              <div className="pt-2">
                <Button type="submit" loading={settingsMutation.isPending}>Save Settings</Button>
              </div>
            )}
          </form>
        )}
      </div>

      {/* ── PAYE Tax Bands Card ────────────────────────────────── */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-900">PAYE Tax Bands</h3>
          {canEdit && (
            <Button onClick={() => openBandModal()}><PlusIcon className="h-4 w-4" />Add Band</Button>
          )}
        </div>
        <Table
          columns={bandColumns}
          data={bandListData}
          loading={bandsLoading}
          emptyMessage="No tax bands defined."
        />
      </div>

      {/* ── Band Modal ─────────────────────────────────────────── */}
      <Modal
        open={bandModal}
        onClose={closeBandModal}
        title={editingBand ? "Edit Tax Band" : "Add Tax Band"}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={closeBandModal}>Cancel</Button>
            <Button loading={saveBandMutation.isPending} onClick={handleB((d) => saveBandMutation.mutate(d))}>
              {editingBand ? "Save Changes" : "Create"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Band Order" type="number" min="1" required
            placeholder="e.g. 1"
            error={errB.order?.message} {...regB("order", { required: "Required", min: 1 })} />
          <Input label="Tax Rate (%)" type="number" step="0.1" required
            placeholder="e.g. 5.0"
            hint="Enter percentage (e.g. 5.0 for 5%)"
            error={errB.rate?.message} {...regB("rate", { required: "Required" })} />
          <Input label="Annual Limit (GHS)" type="number" step="0.01"
            placeholder="Leave blank for top (unlimited) band"
            hint="Upper income limit for this band"
            error={errB.annual_limit?.message} {...regB("annual_limit")} />
          <Input label="Description" placeholder="e.g. First bracket"
            {...regB("description")} />
        </div>
      </Modal>
    </div>
  );
}
