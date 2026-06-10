import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import api from "../../api/axios";
import { AUTH } from "../../api/endpoints";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";

export default function ForgotPassword() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await api.post(AUTH.PASSWORD_RESET_REQUEST, data);
      setSubmitted(true);
      toast.success("Reset request submitted for admin review.");
    } catch (err) {
      const msg =
        err.response?.data?.email?.[0] ||
        err.response?.data?.non_field_errors?.[0] ||
        err.response?.data?.detail ||
        "Request failed. Please try again.";
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
            <h1 className="text-2xl font-bold text-slate-900">Reset Password</h1>
            <p className="text-sm text-slate-500 mt-1">
              Request an admin to reset your password
            </p>
          </div>

          {submitted ? (
            <div className="text-center space-y-4">
              <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-6">
                <p className="text-sm text-green-800">
                  Your password reset request has been submitted. An administrator
                  will review and process it shortly.
                </p>
              </div>
              <Link
                to="/login"
                className="inline-block text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Back to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
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

              <Button
                type="submit"
                loading={loading}
                className="w-full justify-center py-2.5"
              >
                Submit Request
              </Button>

              <p className="text-center text-sm text-slate-500">
                <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                  Back to Sign In
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
