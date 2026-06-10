import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import { EMPLOYEES, LEAVE, PAYROLL, ATTENDANCE } from "../../api/endpoints";
import { useAuthStore } from "../../store/authStore";
import Badge from "../../components/common/Badge";
import {
  UsersIcon,
  ClockIcon,
  CalendarDaysIcon,
  BanknotesIcon,
} from "@heroicons/react/24/outline";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";

function StatCard({ title, value, icon: Icon, color, subtitle, to }) {
  const content = (
    <div className="card hover:shadow-card-hover transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{value ?? "—"}</p>
          {subtitle && (
            <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
          )}
        </div>
        <div className={`rounded-xl p-3 ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );

  return to ? <Link to={to}>{content}</Link> : content;
}

export default function Dashboard() {
  const { user, role } = useAuthStore();
  const today = new Date();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();

  // Fetch employee count
  const { data: employeesData } = useQuery({
    queryKey: ["employees-count"],
    queryFn: () => api.get(EMPLOYEES.LIST + "?page_size=1").then((r) => r.data),
    enabled: ["ADMIN", "HR", "FINANCE"].includes(role),
  });

  // Fetch today's attendance
  const todayStr = format(today, "yyyy-MM-dd");
  const { data: attendanceData } = useQuery({
    queryKey: ["attendance-today", todayStr],
    queryFn: () =>
      api.get(`${ATTENDANCE.LIST}?date=${todayStr}&status=PRESENT&page_size=1`).then((r) => r.data),
    enabled: ["ADMIN", "HR"].includes(role),
  });

  // Fetch pending leave requests
  const { data: leaveData } = useQuery({
    queryKey: ["leave-pending"],
    queryFn: () =>
      api.get(LEAVE.REQUESTS + "?status=PENDING&page_size=1").then((r) => r.data),
    enabled: ["ADMIN", "HR"].includes(role),
  });

  // Fetch latest payroll run
  const { data: payrollData } = useQuery({
    queryKey: ["payroll-latest"],
    queryFn: () =>
      api.get(`${PAYROLL.RUNS}?month=${month}&year=${year}`).then((r) => r.data),
    enabled: ["ADMIN", "FINANCE"].includes(role),
  });

  // Fetch payroll trends for chart
  const { data: payrollTrends } = useQuery({
    queryKey: ["payroll-trends"],
    queryFn: () => api.get(PAYROLL.TRENDS).then((r) => r.data),
    enabled: ["ADMIN", "FINANCE"].includes(role),
  });

  // Recent leave requests
  const { data: recentLeave } = useQuery({
    queryKey: ["leave-recent"],
    queryFn: () =>
      api.get(LEAVE.REQUESTS + "?page_size=5").then((r) => r.data),
  });

  const latestPayroll = payrollData?.results?.[0];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">
          Good {getGreeting()}, {user?.first_name} 👋
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          {format(today, "EEEE, MMMM d, yyyy")} — HR Pro Dashboard
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {["ADMIN", "HR", "FINANCE"].includes(role) && (
          <StatCard
            title="Total Employees"
            value={employeesData?.count}
            icon={UsersIcon}
            color="bg-primary-600"
            subtitle="Active staff"
            to="/employees"
          />
        )}
        {["ADMIN", "HR"].includes(role) && (
          <StatCard
            title="Present Today"
            value={attendanceData?.count}
            icon={ClockIcon}
            color="bg-green-500"
            subtitle={format(today, "MMM d")}
            to="/attendance"
          />
        )}
        {["ADMIN", "HR"].includes(role) && (
          <StatCard
            title="Pending Leave"
            value={leaveData?.count}
            icon={CalendarDaysIcon}
            color="bg-yellow-500"
            subtitle="Awaiting approval"
            to="/leave"
          />
        )}
        {["ADMIN", "FINANCE"].includes(role) && (
          <StatCard
            title="Payroll This Month"
            value={
              latestPayroll
                ? `GHS ${Number(latestPayroll.total_net).toLocaleString()}`
                : "Not run"
            }
            icon={BanknotesIcon}
            color="bg-accent-500"
            subtitle={`${format(today, "MMMM yyyy")}`}
            to="/payroll"
          />
        )}
      </div>

      {/* Charts + Recent activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Payroll chart */}
        {["ADMIN", "FINANCE"].includes(role) && (
          <div className="card lg:col-span-2">
            <h3 className="text-base font-semibold text-slate-900 mb-4">
              Payroll Overview
            </h3>
            {!payrollTrends || payrollTrends.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-10">
                No completed payroll runs yet.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={payrollTrends.map((r) => ({
                    month: `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][r.month - 1]} ${String(r.year).slice(-2)}`,
                    gross: Number(r.total_gross),
                    net: Number(r.total_net),
                  }))}
                  margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(v, name) => [
                      `GHS ${Number(v).toLocaleString()}`,
                      name === "gross" ? "Gross Payroll" : "Net Payroll",
                    ]}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="gross" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="net" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        )}

        {/* Recent leave requests */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-slate-900">
              Recent Leave Requests
            </h3>
            <Link
              to="/leave"
              className="text-xs text-primary-600 hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {recentLeave?.results?.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">
                No recent requests
              </p>
            )}
            {recentLeave?.results?.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {req.employee_name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {req.leave_type_name} · {req.days_requested} day(s)
                  </p>
                </div>
                <Badge status={req.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
