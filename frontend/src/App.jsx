import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import Layout from "./components/layout/Layout";

// Pages
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import ForgotPassword from "./pages/auth/ForgotPassword";
import Dashboard from "./pages/dashboard/Dashboard";
import EmployeeList from "./pages/employees/EmployeeList";
import EmployeeForm from "./pages/employees/EmployeeForm";
import PayrollList from "./pages/payroll/PayrollList";
import PayrollRun from "./pages/payroll/PayrollRun";
import LeaveManagement from "./pages/leave/LeaveManagement";
import Attendance from "./pages/attendance/Attendance";
import LoanManagement from "./pages/loans/LoanManagement";
import Reports from "./pages/reports/Reports";
import Departments from "./pages/departments/Departments";
import Settings from "./pages/settings/Settings";
import PerformanceManagement from "./pages/performance/PerformanceManagement";

/**
 * ProtectedRoute — redirects to /login if not authenticated.
 */
function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

/**
 * RoleRoute — renders children only if user has one of the allowed roles.
 */
function RoleRoute({ allowedRoles, children }) {
  const role = useAuthStore((s) => s.role);
  if (!allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

/**
 * PublicRoute — redirects to /dashboard if already authenticated.
 */
function PublicRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicRoute>
              <Signup />
            </PublicRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPassword />
            </PublicRoute>
          }
        />

        {/* Protected */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Employees — Admin & HR */}
          <Route
            path="/employees"
            element={
              <RoleRoute allowedRoles={["ADMIN", "HR", "FINANCE"]}>
                <EmployeeList />
              </RoleRoute>
            }
          />
          <Route
            path="/employees/new"
            element={
              <RoleRoute allowedRoles={["ADMIN", "HR"]}>
                <EmployeeForm />
              </RoleRoute>
            }
          />
          <Route
            path="/employees/:id/edit"
            element={
              <RoleRoute allowedRoles={["ADMIN", "HR"]}>
                <EmployeeForm />
              </RoleRoute>
            }
          />

          {/* Payroll — Admin & Finance */}
          <Route
            path="/payroll"
            element={
              <RoleRoute allowedRoles={["ADMIN", "FINANCE", "HR"]}>
                <PayrollList />
              </RoleRoute>
            }
          />
          <Route
            path="/payroll/:id"
            element={
              <RoleRoute allowedRoles={["ADMIN", "FINANCE", "HR"]}>
                <PayrollRun />
              </RoleRoute>
            }
          />

          {/* Leave */}
          <Route path="/leave" element={<LeaveManagement />} />

          {/* Attendance */}
          <Route path="/attendance" element={<Attendance />} />

          {/* Loans */}
          <Route path="/loans" element={<LoanManagement />} />

          {/* Reports — Admin & Finance */}
          <Route
            path="/reports"
            element={
              <RoleRoute allowedRoles={["ADMIN", "FINANCE"]}>
                <Reports />
              </RoleRoute>
            }
          />

          {/* Departments — Admin & HR */}
          <Route
            path="/departments"
            element={
              <RoleRoute allowedRoles={["ADMIN", "HR"]}>
                <Departments />
              </RoleRoute>
            }
          />

          {/* Performance — Manager & above (employees see own reviews) */}
          <Route
            path="/performance"
            element={
              <RoleRoute allowedRoles={["ADMIN", "HR", "MANAGER", "MD", "EMPLOYEE"]}>
                <PerformanceManagement />
              </RoleRoute>
            }
          />

          {/* Settings — Admin only */}
          <Route
            path="/settings"
            element={
              <RoleRoute allowedRoles={["ADMIN"]}>
                <Settings />
              </RoleRoute>
            }
          />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
