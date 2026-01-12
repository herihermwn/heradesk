import React, { createContext, useContext, useReducer, useCallback, useEffect, type ReactNode } from "react";
import type { User, ChatSession, CsWithStatus, DashboardStats, ActivityLog } from "../types";
import { adminApi } from "../services/api";

// ============================================
// STATE TYPES
// ============================================

interface AdminState {
  // Users
  users: User[];
  usersTotal: number;
  usersPage: number;
  usersTotalPages: number;

  // CS Status
  csUsers: CsWithStatus[];

  // Chats
  chats: ChatSession[];
  chatsTotal: number;
  chatsPage: number;
  chatsTotalPages: number;

  // Stats
  stats: DashboardStats | null;

  // Activity Logs
  logs: ActivityLog[];
  logsTotal: number;
  logsPage: number;
  logsTotalPages: number;

  // Settings
  settings: Record<string, any>;

  // UI state
  isLoading: boolean;
  error: string | null;
}

// ============================================
// ACTIONS
// ============================================

type AdminAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_USERS"; payload: { users: User[]; total: number; page: number; totalPages: number } }
  | { type: "ADD_USER"; payload: User }
  | { type: "UPDATE_USER"; payload: User }
  | { type: "REMOVE_USER"; payload: string }
  | { type: "SET_CS_USERS"; payload: CsWithStatus[] }
  | { type: "SET_CHATS"; payload: { chats: ChatSession[]; total: number; page: number; totalPages: number } }
  | { type: "SET_STATS"; payload: DashboardStats }
  | { type: "SET_LOGS"; payload: { logs: ActivityLog[]; total: number; page: number; totalPages: number } }
  | { type: "SET_SETTINGS"; payload: Record<string, any> };

// ============================================
// REDUCER
// ============================================

const initialState: AdminState = {
  users: [],
  usersTotal: 0,
  usersPage: 1,
  usersTotalPages: 1,
  csUsers: [],
  chats: [],
  chatsTotal: 0,
  chatsPage: 1,
  chatsTotalPages: 1,
  stats: null,
  logs: [],
  logsTotal: 0,
  logsPage: 1,
  logsTotalPages: 1,
  settings: {},
  isLoading: false,
  error: null,
};

function adminReducer(state: AdminState, action: AdminAction): AdminState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "SET_USERS":
      return {
        ...state,
        users: action.payload.users,
        usersTotal: action.payload.total,
        usersPage: action.payload.page,
        usersTotalPages: action.payload.totalPages,
      };
    case "ADD_USER":
      return { ...state, users: [action.payload, ...state.users] };
    case "UPDATE_USER":
      return {
        ...state,
        users: state.users.map((u) =>
          u.id === action.payload.id ? action.payload : u
        ),
      };
    case "REMOVE_USER":
      return {
        ...state,
        users: state.users.filter((u) => u.id !== action.payload),
      };
    case "SET_CS_USERS":
      return { ...state, csUsers: action.payload };
    case "SET_CHATS":
      return {
        ...state,
        chats: action.payload.chats,
        chatsTotal: action.payload.total,
        chatsPage: action.payload.page,
        chatsTotalPages: action.payload.totalPages,
      };
    case "SET_STATS":
      return { ...state, stats: action.payload };
    case "SET_LOGS":
      return {
        ...state,
        logs: action.payload.logs,
        logsTotal: action.payload.total,
        logsPage: action.payload.page,
        logsTotalPages: action.payload.totalPages,
      };
    case "SET_SETTINGS":
      return { ...state, settings: action.payload };
    default:
      return state;
  }
}

// ============================================
// CONTEXT
// ============================================

interface AdminContextValue extends AdminState {
  loadUsers: (page?: number) => Promise<void>;
  createUser: (data: { username: string; password: string; name: string; role: "admin" | "cs" }) => Promise<boolean>;
  updateUser: (id: string, data: Partial<User & { password?: string }>) => Promise<boolean>;
  deleteUser: (id: string) => Promise<boolean>;
  loadCsUsers: () => Promise<void>;
  loadChats: (page?: number, status?: string) => Promise<void>;
  loadStats: () => Promise<void>;
  loadLogs: (page?: number) => Promise<void>;
  loadSettings: () => Promise<void>;
  updateSettings: (settings: Record<string, any>) => Promise<boolean>;
  clearError: () => void;
}

const AdminContext = createContext<AdminContextValue | null>(null);

// ============================================
// PROVIDER
// ============================================

interface AdminProviderProps {
  children: ReactNode;
  token: string;
}

export function AdminProvider({ children, token }: AdminProviderProps) {
  const [state, dispatch] = useReducer(adminReducer, initialState);

  // Load users
  const loadUsers = useCallback(async (page: number = 1) => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const response = await adminApi.getUsers();
      if (response.success && response.data) {
        dispatch({
          type: "SET_USERS",
          payload: {
            users: response.data,
            total: response.data.length,
            page: 1,
            totalPages: 1,
          },
        });
      }
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: "Gagal memuat data user" });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, []);

  // Create user
  const createUser = useCallback(async (data: { username: string; password: string; name: string; role: "admin" | "cs" }) => {
    try {
      const response = await adminApi.createUser(data);
      if (response.success && response.data) {
        dispatch({ type: "ADD_USER", payload: response.data });
        return true;
      } else {
        dispatch({ type: "SET_ERROR", payload: response.message || "Gagal membuat user" });
        return false;
      }
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: "Gagal membuat user" });
      return false;
    }
  }, []);

  // Update user
  const updateUser = useCallback(async (id: string, data: Partial<User & { password?: string }>) => {
    try {
      const response = await adminApi.updateUser(id, data);
      if (response.success && response.data) {
        dispatch({ type: "UPDATE_USER", payload: response.data });
        return true;
      } else {
        dispatch({ type: "SET_ERROR", payload: response.message || "Gagal memperbarui user" });
        return false;
      }
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: "Gagal memperbarui user" });
      return false;
    }
  }, []);

  // Delete user
  const deleteUser = useCallback(async (id: string) => {
    try {
      const response = await adminApi.deleteUser(id);
      if (response.success) {
        dispatch({ type: "REMOVE_USER", payload: id });
        return true;
      } else {
        dispatch({ type: "SET_ERROR", payload: response.message || "Gagal menghapus user" });
        return false;
      }
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: "Gagal menghapus user" });
      return false;
    }
  }, []);

  // Load CS users
  const loadCsUsers = useCallback(async () => {
    try {
      const response = await adminApi.getCsStatuses();
      if (response.success && response.data) {
        dispatch({ type: "SET_CS_USERS", payload: response.data });
      }
    } catch (error) {
      console.error("[AdminStore] Load CS users error:", error);
    }
  }, []);

  // Load chats
  const loadChats = useCallback(async (page: number = 1, status?: string) => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const response = await adminApi.getAllChats({ page, status });
      if (response.success && response.data) {
        dispatch({
          type: "SET_CHATS",
          payload: {
            chats: response.data,
            total: response.data.length,
            page: 1,
            totalPages: 1,
          },
        });
      }
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: "Gagal memuat data chat" });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, []);

  // Load stats
  const loadStats = useCallback(async () => {
    try {
      const response = await adminApi.getStats();
      if (response.success && response.data) {
        dispatch({ type: "SET_STATS", payload: response.data });
      }
    } catch (error) {
      console.error("[AdminStore] Load stats error:", error);
    }
  }, []);

  // Load logs
  const loadLogs = useCallback(async (page: number = 1) => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      // TODO: Implement logs API
      dispatch({
        type: "SET_LOGS",
        payload: {
          logs: [],
          total: 0,
          page: 1,
          totalPages: 1,
        },
      });
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: "Gagal memuat log aktivitas" });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, []);

  // Load settings
  const loadSettings = useCallback(async () => {
    try {
      // TODO: Implement settings API
      dispatch({
        type: "SET_SETTINGS",
        payload: {
          maxChatsPerCs: 5,
          autoAssignment: true,
          businessHoursEnabled: false,
          businessHoursStart: "08:00",
          businessHoursEnd: "17:00",
          offlineMessage: "Terima kasih sudah menghubungi kami.",
          welcomeMessage: "Halo! Ada yang bisa kami bantu?",
        },
      });
    } catch (error) {
      console.error("[AdminStore] Load settings error:", error);
    }
  }, []);

  // Update settings
  const updateSettings = useCallback(async (settings: Record<string, any>) => {
    try {
      // TODO: Implement settings update API
      dispatch({ type: "SET_SETTINGS", payload: settings });
      return true;
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: "Gagal menyimpan pengaturan" });
      return false;
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    dispatch({ type: "SET_ERROR", payload: null });
  }, []);

  const value: AdminContextValue = {
    ...state,
    loadUsers,
    createUser,
    updateUser,
    deleteUser,
    loadCsUsers,
    loadChats,
    loadStats,
    loadLogs,
    loadSettings,
    updateSettings,
    clearError,
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

export function useAdminStore() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error("useAdminStore must be used within AdminProvider");
  }
  return context;
}
