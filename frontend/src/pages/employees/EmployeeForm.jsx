import React, { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import api from "../../api/axios";
import { EMPLOYEES, DEPARTMENTS } from "../../api/endpoints";
import Button from "../../components/common/Button";
import Input, { Select, Textarea } from "../../components/common/Input";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

const SECTION = ({ title, children }) => (
  <div className="card space-y-4">
    <h3 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-3">
      {title}
    </h3>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
  </div>
);

export default function EmployeeForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = Boolean(id);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm();

  // Load existing employee data for edit
  const { data: employee, isLoading: loadingEmployee } = useQuery({
    queryKey: ["employee", id],
    queryFn: () => api.get(EMPLOYEES.DETAIL(id)).then((r) => r.data),
    enabled: isEdit,
  });

  // Load departments
  const { data: departments } = useQuery({
    queryKey: ["departments-simple"],
    queryFn: () =>
      api.get(DEPARTMENTS.LIST + "?page_size=100").then((r) => r.data),
  });

  const selectedDept = watch("department");

  // Load positions for selected department
  const { data: positions } = useQuery({
    queryKey: ["positions", selectedDept],
    queryFn: () =>
      api
        .get(`${DEPARTMENTS.POSITIONS}?department=${selectedDept}&page_size=100`)
        .then((r) => r.data),
    enabled: !!selectedDept,
  });

  // Populate form when editing
  useEffect(() => {
    if (employee) {
      reset({
        ...employee,
        department: employee.department,
        position: employee.position,
      });
    }
  }, [employee, reset]);

  const mutation = useMutation({
    mutationFn: (data) =>
      isEdit
        ? api.patch(EMPLOYEES.DETAIL(id), data)
        : api.post(EMPLOYEES.LIST, data),
    onSuccess: () => {
      toast.success(isEdit ? "Employee updated." : "Employee created.");
      queryClient.invalidateQueries(["employees"]);
      navigate("/employees");
    },
    onError: (err) => {
      const detail = err.response?.data;
      if (typeof detail === "object") {
        const messages = Object.entries(detail)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
          .join("\n");
        toast.error(messages);
      } else {
        toast.error("Failed to save employee.");
      }
    },
  });

  const onSubmit = (data) => mutation.mutate(data);

  if (isEdit && loadingEmployee) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/employees")}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            {isEdit ? "Edit Employee" : "Add New Employee"}
          </h2>
          {isEdit && employee && (
            <p className="text-sm text-slate-500">
              {employee.employee_id} — {employee.full_name}
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {/* Personal Information */}
        <SECTION title="Personal Information">
          <Input
            label="First Name"
            required
            error={errors.first_name?.message}
            {...register("first_name", { required: "First name is required" })}
          />
          <Input
            label="Last Name"
            required
            error={errors.last_name?.message}
            {...register("last_name", { required: "Last name is required" })}
          />
          <Input
            label="Other Name"
            {...register("other_name")}
          />
          <Input
            label="Date of Birth"
            type="date"
            required
            error={errors.date_of_birth?.message}
            {...register("date_of_birth", { required: "Date of birth is required" })}
          />
          <Select
            label="Gender"
            required
            error={errors.gender?.message}
            {...register("gender", { required: "Gender is required" })}
          >
            <option value="">Select gender</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </Select>
          <Input
            label="Ghana Card Number"
            placeholder="GHA-XXXXXXXXX-X"
            required
            error={errors.national_id?.message}
            {...register("national_id", { required: "Ghana Card number is required" })}
          />
          <Input
            label="Phone Number"
            type="tel"
            placeholder="0XX XXX XXXX"
            required
            error={errors.phone?.message}
            {...register("phone", { required: "Phone number is required" })}
          />
          <Input
            label="Personal Email"
            type="email"
            {...register("personal_email")}
          />
          <Textarea
            label="Residential Address"
            required
            containerClassName="sm:col-span-2"
            error={errors.address?.message}
            {...register("address", { required: "Address is required" })}
          />
        </SECTION>

        {/* Employment Details */}
        <SECTION title="Employment Details">
          <Select
            label="Department"
            required
            error={errors.department?.message}
            {...register("department", { required: "Department is required" })}
          >
            <option value="">Select department</option>
            {departments?.results?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
          <Select
            label="Position"
            required
            error={errors.position?.message}
            {...register("position", { required: "Position is required" })}
          >
            <option value="">Select position</option>
            {positions?.results?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </Select>
          <Select
            label="Employment Type"
            required
            error={errors.employment_type?.message}
            {...register("employment_type", { required: "Employment type is required" })}
          >
            <option value="">Select type</option>
            <option value="FULL_TIME">Full-time</option>
            <option value="PART_TIME">Part-time</option>
            <option value="CONTRACT">Contract</option>
            <option value="INTERN">Intern</option>
          </Select>
          <Select
            label="Employment Status"
            required
            error={errors.employment_status?.message}
            {...register("employment_status", { required: "Status is required" })}
          >
            <option value="">Select status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="TERMINATED">Terminated</option>
          </Select>
          <Input
            label="Date Joined"
            type="date"
            required
            error={errors.date_joined?.message}
            {...register("date_joined", { required: "Date joined is required" })}
          />
          <Input
            label="Date Terminated"
            type="date"
            {...register("date_terminated")}
          />
        </SECTION>

        {/* Statutory Numbers */}
        <SECTION title="Statutory Numbers (Ghana)">
          <Input
            label="SSNIT Number"
            placeholder="SSNIT membership number"
            hint="Social Security and National Insurance Trust"
            {...register("ssnit_number")}
          />
          <Input
            label="TIN Number"
            placeholder="GRA Tax Identification Number"
            hint="Ghana Revenue Authority TIN"
            {...register("tin_number")}
          />
        </SECTION>

        {/* Banking Details */}
        <SECTION title="Banking Details">
          <Input
            label="Bank Name"
            placeholder="e.g. GCB Bank, Ecobank"
            {...register("bank_name")}
          />
          <Input
            label="Account Number"
            {...register("bank_account_number")}
          />
          <Input
            label="Bank Branch"
            {...register("bank_branch")}
          />
        </SECTION>

        {/* Emergency Contact */}
        <SECTION title="Emergency Contact">
          <Input
            label="Contact Name"
            {...register("emergency_contact_name")}
          />
          <Input
            label="Contact Phone"
            type="tel"
            {...register("emergency_contact_phone")}
          />
          <Input
            label="Relationship"
            placeholder="e.g. Spouse, Parent, Sibling"
            {...register("emergency_contact_relationship")}
          />
        </SECTION>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate("/employees")}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={mutation.isPending}
            disabled={isEdit && !isDirty}
          >
            {isEdit ? "Save Changes" : "Create Employee"}
          </Button>
        </div>
      </form>
    </div>
  );
}
