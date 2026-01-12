import { useState, useEffect, useCallback } from "react";
import type { User, AuthState, LoginCredentials } from "../types";
import { authApi } from "../services/api";

// ============================================
// TYPES
// ============================================

interface UseAuthReturn extends AuthState {
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
}

// ============================================
// HOOK
// ============================================

export function useAuth(): UseAuthReturn {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: localStorage.getItem("token"),
    isLoading: true,
    isAuthenticated: false,
  });

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      checkAuth();
    } else {
      setState((prev) => ({
        ...prev,
        isLoading: false,
      }));
    }
  }, []);

  const checkAuth = useCallback(async (): Promise<boolean> => {
    const token = localStorage.getItem("token");

    if (!token) {
      setState({
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
      });
      return false;
    }

    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const response = await authApi.getMe();

      if (response.success && response.data) {
        setState({
          user: response.data,
          token,
          isLoading: false,
          isAuthenticated: true,
        });
        return true;
      } else {
        // Token is invalid, clear it
        localStorage.removeItem("token");
        setState({
          user: null,
          token: null,
          isLoading: false,
          isAuthenticated: false,
        });
        return false;
      }
    } catch (error) {
      console.error("[useAuth] Check auth error:", error);
      localStorage.removeItem("token");
      setState({
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
      });
      return false;
    }
  }, []);

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<boolean> => {
      setState((prev) => ({ ...prev, isLoading: true }));

      try {
        const response = await authApi.login(credentials);

        if (response.success && response.data) {
          setState({
            user: response.data.user,
            token: response.data.token,
            isLoading: false,
            isAuthenticated: true,
          });
          return true;
        } else {
          setState((prev) => ({
            ...prev,
            isLoading: false,
          }));
          return false;
        }
      } catch (error) {
        console.error("[useAuth] Login error:", error);
        setState((prev) => ({
          ...prev,
          isLoading: false,
        }));
        return false;
      }
    },
    []
  );

  const logout = useCallback(async (): Promise<void> => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      await authApi.logout();
    } catch (error) {
      console.error("[useAuth] Logout error:", error);
    } finally {
      localStorage.removeItem("token");
      setState({
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  }, []);

  return {
    ...state,
    login,
    logout,
    checkAuth,
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function getStoredToken(): string | null {
  return localStorage.getItem("token");
}

export function setStoredToken(token: string): void {
  localStorage.setItem("token", token);
}

export function clearStoredToken(): void {
  localStorage.removeItem("token");
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem("token");
}

export function redirectToLogin(): void {
  window.location.href = "/login";
}

export function redirectToDashboard(role: "admin" | "cs"): void {
  window.location.href = role === "admin" ? "/admin" : "/cs";
}

export default useAuth;
