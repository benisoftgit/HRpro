/**
 * Zustand auth store.
 *
 * Persists user, access token, refresh token, and role to localStorage.
 * Provides login, logout, and updateUser actions.
 */

import { create } from "zustand";

// Rehydrate from localStorage on app load
const storedUser = (() => {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
})();

const storedToken = localStorage.getItem("access_token") || null;
const storedRefresh = localStorage.getItem("refresh_token") || null;

export const useAuthStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────────────────────────
  user: storedUser,
  token: storedToken,
  refreshToken: storedRefresh,
  role: storedUser?.role || null,
  isAuthenticated: !!(storedToken && storedUser),

  // ── Actions ────────────────────────────────────────────────────────────────

  /**
   * Called after successful login.
   * Stores tokens and user data in state and localStorage.
   */
  login: ({ access, refresh, user }) => {
    localStorage.setItem("access_token", access);
    localStorage.setItem("refresh_token", refresh);
    localStorage.setItem("user", JSON.stringify(user));
    set({
      token: access,
      refreshToken: refresh,
      user,
      role: user.role,
      isAuthenticated: true,
    });
  },

  /**
   * Clears all auth state and localStorage.
   */
  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    set({
      token: null,
      refreshToken: null,
      user: null,
      role: null,
      isAuthenticated: false,
    });
  },

  /**
   * Update user profile data in state and localStorage.
   */
  updateUser: (updatedUser) => {
    const merged = { ...get().user, ...updatedUser };
    localStorage.setItem("user", JSON.stringify(merged));
    set({ user: merged, role: merged.role, isAuthenticated: true });
  },
}));
