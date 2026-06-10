import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import api from "../../api/axios";
import { AUTH } from "../../api/endpoints";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";

export default function Signup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await api.post(AUTH.REGISTER, data);
      toast.success(
        "Registration submitted! An administrator will review and activate your account."
      );
      navigate("/login");
    } catch (err) {
      const msg =
        err.response?.data?.email?.[0] ||
        err.response?.data?.non_field_errors?.[0] ||
        err.response?.data?.detail ||
        "Registration failed. Please try again.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-600 mb-4">
              <span className="text-2xl font-bold text-white">HR</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Create Account</h1>
            <p className="text-sm text-slate-500 mt-1">
              Register for an HR Pro account
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
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
            </div>

            <Input
              label="Email Address"
              type="email"
              placeholder="you@company.com"
              required
              error={errors.email?.message}
              {...register("email", {
                required: "Email is required",
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: "Enter a valid email address",
                },
              })}
            />

            <Input
              label="Phone Number"
              type="tel"
              placeholder="+233 XX XXX XXXX"
              error={errors.phone?.message}
              {...register("phone")}
            />

            <Input
              label="Password"
              type="password"
              required
              error={errors.password?.message}
              hint="Minimum 8 characters"
              {...register("password", {
                required: "Password is required",
                minLength: {
                  value: 8,
                  message: "Password must be at least 8 characters",
                },
              })}
            />

            <Input
              label="Confirm Password"
              type="password"
              required
              error={errors.confirm_password?.message}
              {...register("confirm_password", {
                required: "Please confirm your password",
                validate: (v) => v === watch("password") || "Passwords do not match",
              })}
            />

            <Button
              type="submit"
              loading={loading}
              className="w-full justify-center py-2.5"
            >
              Register
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
