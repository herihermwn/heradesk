import type {
  ApiResponse,
  LoginCredentials,
  LoginResponse,
  User,
  ChatSession,
  CsStatus,
  CsState,
  CsWithStatus,
  CsStats,
  CannedResponse,
  QueueStats,
  DashboardStats,
} from "../types";

// ============================================
// API CONFIGURATION
// ============================================

const API_BASE_URL = "/api";

// ============================================
// HELPER FUNCTIONS
// ============================================

function getAuthToken(): string | null {
  return localStorage.getItem("token");
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getAuthToken();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.message || "Request failed",
        error: data.error,
      };
    }

    return data;
  } catch (error) {
    console.error("[API] Request error:", error);
    return {
      success: false,
      message: "Network error",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================
// AUTH API
// ============================================

export const authApi = {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await request<{ token: string; user: User }>(
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify(credentials),
      }
    );

    if (response.success && response.data) {
      localStorage.setItem("token", response.data.token);
    }

    return response as LoginResponse;
  },

  async logout(): Promise<ApiResponse<void>> {
    const response = await request<void>("/auth/logout", {
      method: "POST",
    });

    localStorage.removeItem("token");
    return response;
  },

  async getMe(): Promise<ApiResponse<User>> {
    return request<User>("/auth/me");
  },
};

// ============================================
// CHAT API (Customer)
// ============================================

export const chatApi = {
  async init(data: {
    customerName?: string;
    customerEmail?: string;
  }): Promise<ApiResponse<{ session: ChatSession }>> {
    return request<{ session: ChatSession }>("/chat/init", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async getSession(
    token: string
  ): Promise<ApiResponse<{ session: ChatSession }>> {
    return request<{ session: ChatSession }>(`/chat/session/${token}`);
  },

  async submitRating(data: {
    sessionId: string;
    rating: number;
    feedback?: string;
  }): Promise<ApiResponse<void>> {
    return request<void>("/chat/rating", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async getQueue(): Promise<ApiResponse<QueueStats>> {
    return request<QueueStats>("/chat/queue");
  },
};

// ============================================
// CS API
// ============================================

export const csApi = {
  // Status
  async getStatus(): Promise<ApiResponse<CsStatus>> {
    return request<CsStatus>("/cs/status");
  },

  async updateStatus(status: CsState): Promise<ApiResponse<CsStatus>> {
    return request<CsStatus>("/cs/status", {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
  },

  // Chats
  async getChats(): Promise<ApiResponse<ChatSession[]>> {
    return request<ChatSession[]>("/cs/chats");
  },

  async getChatDetail(
    sessionId: string
  ): Promise<ApiResponse<{ session: ChatSession }>> {
    return request<{ session: ChatSession }>(`/cs/chats/${sessionId}`);
  },

  async getHistory(params?: {
    page?: number;
    limit?: number;
  }): Promise<{ success: boolean; data?: ChatSession[]; total?: number; page?: number; totalPages?: number; message?: string }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.set("page", params.page.toString());
    if (params?.limit) queryParams.set("limit", params.limit.toString());

    const query = queryParams.toString();
    const result = await request<{ chats: ChatSession[]; total: number; page: number; totalPages: number }>(
      `/cs/history${query ? `?${query}` : ""}`
    );

    return {
      success: result.success,
      data: (result as { chats?: ChatSession[] }).chats,
      total: (result as { total?: number }).total,
      page: (result as { page?: number }).page,
      totalPages: (result as { totalPages?: number }).totalPages,
      message: result.message,
    };
  },

  // Queue
  async getQueue(): Promise<ApiResponse<ChatSession[]>> {
    return request<ChatSession[]>("/cs/queue");
  },

  async acceptChat(sessionId: string): Promise<ApiResponse<ChatSession>> {
    return request<ChatSession>(`/cs/chats/${sessionId}/accept`, {
      method: "POST",
    });
  },

  async resolveChat(
    sessionId: string,
    notes?: string
  ): Promise<ApiResponse<ChatSession>> {
    return request<ChatSession>(`/cs/chats/${sessionId}/resolve`, {
      method: "POST",
      body: JSON.stringify({ notes }),
    });
  },

  async transferChat(
    sessionId: string,
    targetCsId: string
  ): Promise<ApiResponse<ChatSession>> {
    return request<ChatSession>(`/cs/chats/${sessionId}/transfer`, {
      method: "POST",
      body: JSON.stringify({ targetCsId }),
    });
  },

  // Online CS
  async getOnlineCS(): Promise<ApiResponse<CsWithStatus[]>> {
    return request<CsWithStatus[]>("/cs/online");
  },

  // Stats
  async getStats(): Promise<ApiResponse<CsStats>> {
    return request<CsStats>("/cs/stats");
  },

  // Canned Responses
  async getCannedResponses(): Promise<ApiResponse<CannedResponse[]>> {
    return request<CannedResponse[]>("/cs/canned-responses");
  },

  async createCannedResponse(data: {
    title: string;
    content: string;
    shortcut?: string;
  }): Promise<ApiResponse<CannedResponse>> {
    return request<CannedResponse>("/cs/canned-responses", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async deleteCannedResponse(id: string): Promise<ApiResponse<void>> {
    return request<void>(`/cs/canned-responses/${id}`, {
      method: "DELETE",
    });
  },
};

// ============================================
// ADMIN API
// ============================================

export const adminApi = {
  // Users
  async getUsers(): Promise<ApiResponse<User[]>> {
    return request<User[]>("/admin/users");
  },

  async createUser(data: {
    username: string;
    password: string;
    name: string;
    role: "admin" | "cs";
  }): Promise<ApiResponse<User>> {
    return request<User>("/admin/users", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateUser(
    id: string,
    data: Partial<User & { password?: string }>
  ): Promise<ApiResponse<User>> {
    return request<User>(`/admin/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async deleteUser(id: string): Promise<ApiResponse<void>> {
    return request<void>(`/admin/users/${id}`, {
      method: "DELETE",
    });
  },

  // Chats
  async getAllChats(params?: {
    status?: string;
    csId?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<ChatSession[]>> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.set("status", params.status);
    if (params?.csId) queryParams.set("csId", params.csId);
    if (params?.page) queryParams.set("page", params.page.toString());
    if (params?.limit) queryParams.set("limit", params.limit.toString());

    const query = queryParams.toString();
    return request<ChatSession[]>(`/admin/chats${query ? `?${query}` : ""}`);
  },

  // Stats
  async getStats(): Promise<ApiResponse<DashboardStats>> {
    return request<DashboardStats>("/admin/stats");
  },

  // CS Status
  async getCsStatuses(): Promise<ApiResponse<CsWithStatus[]>> {
    return request<CsWithStatus[]>("/admin/cs-status");
  },
};

// ============================================
// EXPORT DEFAULT API OBJECT
// ============================================

export const api = {
  auth: authApi,
  chat: chatApi,
  cs: csApi,
  admin: adminApi,
};

export default api;
