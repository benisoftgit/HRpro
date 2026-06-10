import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import api from "../../api/axios";
import { AUTH } from "../../api/endpoints";
import toast from "react-hot-toast";
import {
  Bars3Icon,
  BellIcon,
  ChevronDownIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";

const ROLE_LABELS = {
  ADMIN: "Administrator",
  HR: "HR Manager",
  FINANCE: "Finance Officer",
  MANAGER: "Line Manager",
  MD: "Managing Director",
  EMPLOYEE: "Employee",
};

const ROLE_COLORS = {
  ADMIN: "bg-purple-100 text-purple-700",
  HR: "bg-blue-100 text-blue-700",
  FINANCE: "bg-green-100 text-green-700",
  MANAGER: "bg-amber-100 text-amber-700",
  MD: "bg-rose-100 text-rose-700",
  EMPLOYEE: "bg-slate-100 text-slate-700",
};

export default function Header({ onMenuClick }) {
  const navigate = useNavigate();
  const { user, role, logout, refreshToken } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await api.post(AUTH.LOGOUT, { refresh: refreshToken });
    } catch {
      // Proceed with logout even if API call fails
    }
    logout();
    toast.success("Logged out successfully");
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-6">
      {/* Left — hamburger + title */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:hidden"
          aria-label="Open menu"
        >
          <Bars3Icon className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold text-slate-900 hidden sm:block">
          HR Pro
          <span className="ml-2 text-xs font-normal text-slate-400">Ghana</span>
        </h1>
      </div>

      {/* Right — notifications + user menu */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <button
          className="relative rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Notifications"
        >
          <BellIcon className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />
        </button>

        {/* User dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100 transition-colors"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-700 font-semibold text-sm">
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-slate-900 leading-tight">
                {user?.first_name} {user?.last_name}
              </p>
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${ROLE_COLORS[role] || "bg-slate-100 text-slate-600"}`}
              >
                {ROLE_LABELS[role] || role}
              </span>
            </div>
            <ChevronDownIcon className="h-4 w-4 text-slate-400" />
          </button>

          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute right-0 z-20 mt-2 w-52 rounded-xl border border-slate-200 bg-white shadow-lg py-1">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-sm font-medium text-slate-900">
                    {user?.first_name} {user?.last_name}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                </div>
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate("/settings");
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <UserCircleIcon className="h-4 w-4" />
                  My Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <ArrowRightOnRectangleIcon className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
