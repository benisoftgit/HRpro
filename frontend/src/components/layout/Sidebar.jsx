import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import {
  HomeIcon,
  UsersIcon,
  BuildingOfficeIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  ClockIcon,
  CreditCardIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  XMarkIcon,
  ArrowTrendingUpIcon,
} from "@heroicons/react/24/outline";

const ALL_NAV_ITEMS = [
  {
    label: "Dashboard",
    to: "/dashboard",
    icon: HomeIcon,
    roles: ["ADMIN", "HR", "FINANCE", "EMPLOYEE"],
  },
  {
    label: "Employees",
    to: "/employees",
    icon: UsersIcon,
    roles: ["ADMIN", "HR", "FINANCE"],
  },
  {
    label: "Departments",
    to: "/departments",
    icon: BuildingOfficeIcon,
    roles: ["ADMIN", "HR"],
  },
  {
    label: "Payroll",
    to: "/payroll",
    icon: BanknotesIcon,
    roles: ["ADMIN", "FINANCE", "HR"],
  },
  {
    label: "Performance",
    to: "/performance",
    icon: ArrowTrendingUpIcon,
    roles: ["ADMIN", "HR", "MANAGER", "MD", "EMPLOYEE"],
  },
  {
    label: "Leave",
    to: "/leave",
    icon: CalendarDaysIcon,
    roles: ["ADMIN", "HR", "FINANCE", "EMPLOYEE"],
  },
  {
    label: "Attendance",
    to: "/attendance",
    icon: ClockIcon,
    roles: ["ADMIN", "HR", "FINANCE", "EMPLOYEE"],
  },
  {
    label: "Loans",
    to: "/loans",
    icon: CreditCardIcon,
    roles: ["ADMIN", "FINANCE", "HR", "EMPLOYEE"],
  },
  {
    label: "Reports",
    to: "/reports",
    icon: ChartBarIcon,
    roles: ["ADMIN", "FINANCE"],
  },
  {
    label: "Settings",
    to: "/settings",
    icon: Cog6ToothIcon,
    roles: ["ADMIN"],
  },
];

export default function Sidebar({ open, onClose }) {
  const role = useAuthStore((s) => s.role);
  const navItems = ALL_NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-slate-900/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-white border-r border-slate-200
          transform transition-transform duration-200 ease-in-out
          ${open ? "translate-x-0" : "-translate-x-full"}
          lg:relative lg:translate-x-0 lg:z-auto
        `}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
              <span className="text-xs font-bold text-white">HR</span>
            </div>
            <span className="text-lg font-bold text-slate-900">HR Pro</span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden rounded-md p-1 text-slate-400 hover:text-slate-600"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-200 px-4 py-3">
          <p className="text-xs text-slate-400 text-center">
            HR Pro &copy; {new Date().getFullYear()} Ghana
          </p>
        </div>
      </aside>
    </>
  );
}
