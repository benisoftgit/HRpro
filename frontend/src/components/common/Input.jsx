import React, { forwardRef } from "react";

/**
 * Reusable form input with label and error display.
 */
const Input = forwardRef(function Input(
  {
    label,
    error,
    hint,
    required,
    className = "",
    containerClassName = "",
    type = "text",
    ...props
  },
  ref
) {
  return (
    <div className={`space-y-1 ${containerClassName}`}>
      {label && (
        <label className="block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}
      <input
        ref={ref}
        type={type}
        className={`form-input ${error ? "border-red-400 focus:border-red-500 focus:ring-red-500/20" : ""} ${className}`}
        {...props}
      />
      {hint && !error && (
        <p className="text-xs text-slate-500">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
});

export default Input;

/**
 * Select input variant.
 */
export const Select = forwardRef(function Select(
  { label, error, required, children, className = "", containerClassName = "", ...props },
  ref
) {
  return (
    <div className={`space-y-1 ${containerClassName}`}>
      {label && (
        <label className="block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}
      <select
        ref={ref}
        className={`form-input ${error ? "border-red-400" : ""} ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
});

/**
 * Textarea variant.
 */
export const Textarea = forwardRef(function Textarea(
  { label, error, required, className = "", containerClassName = "", rows = 3, ...props },
  ref
) {
  return (
    <div className={`space-y-1 ${containerClassName}`}>
      {label && (
        <label className="block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        rows={rows}
        className={`form-input resize-none ${error ? "border-red-400" : ""} ${className}`}
        {...props}
      />
      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
});
