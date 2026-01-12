// ============================================
// USER & AUTH TYPES
// ============================================

export type UserRole = "admin" | "cs";

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  avatarUrl?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  data?: {
    token: string;
    user: User;
  };
  message?: string;
}

// ============================================
// CS STATUS TYPES
// ============================================

export type CsState = "online" | "busy" | "offline";

export interface CsStatus {
  userId: string;
  state: CsState;
  activeChats: number;
  maxChats: number;
  lastActiveAt: string;
}

export interface CsWithStatus extends User {
  status?: CsStatus;
  stats?: {
    totalChats: number;
    resolvedChats: number;
    avgRating: number;
  };
}

// ============================================
// CHAT SESSION TYPES
// ============================================

export type ChatStatus = "waiting" | "active" | "resolved" | "abandoned";
export type SenderType = "customer" | "cs" | "system";
export type MessageType = "text" | "image" | "file" | "system";

export interface ChatSession {
  id: string;
  customerName?: string | null;
  customerEmail?: string | null;
  customerToken: string;
  status: ChatStatus;
  csId?: string | null;
  cs?: User | null;
  rating?: number | null;
  ratingFeedback?: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
  messages?: Message[];
  _count?: {
    messages: number;
  };
}

export interface Message {
  id: string;
  sessionId: string;
  senderType: SenderType;
  senderId?: string | null;
  content: string;
  messageType: MessageType;
  fileUrl?: string | null;
  createdAt: string;
}

// ============================================
// QUEUE TYPES
// ============================================

export interface QueueStats {
  waitingCount: number;
  activeCount: number;
  onlineCSCount: number;
  estimatedWaitTime: number;
}

export interface QueueItem {
  session: ChatSession;
  position: number;
  waitTime: number;
}

// ============================================
// WEBSOCKET TYPES
// ============================================

export interface WebSocketMessage<T = any> {
  event: string;
  data: T;
  timestamp: number;
  requestId?: string;
}

export type WebSocketStatus = "connecting" | "connected" | "disconnected" | "error";

export interface WebSocketConfig {
  url: string;
  role: "customer" | "cs" | "admin";
  token?: string;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================
// STATS TYPES
// ============================================

export interface DashboardStats {
  activeChats: number;
  waitingChats: number;
  todayChats: number;
  onlineCS: number;
  avgRating?: number;
}

export interface CsStats {
  todayChats: number;
  resolvedToday: number;
  avgResponseTime: number;
  avgRating: number;
}

// ============================================
// CANNED RESPONSE TYPES
// ============================================

export interface CannedResponse {
  id: string;
  userId: string;
  title: string;
  content: string;
  shortcut?: string | null;
  createdAt: string;
}

// ============================================
// ACTIVITY LOG TYPES
// ============================================

export interface ActivityLog {
  id: string;
  userId?: string | null;
  user?: User | null;
  action: string;
  details?: string | null;
  ipAddress?: string | null;
  createdAt: string;
}

// ============================================
// NOTIFICATION TYPES
// ============================================

export interface Notification {
  id: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message?: string;
  duration?: number;
  createdAt: number;
}

// ============================================
// CHAT WIDGET TYPES
// ============================================

export interface ChatWidgetState {
  isOpen: boolean;
  isMinimized: boolean;
  sessionToken: string | null;
  customerName: string;
  customerEmail: string;
  hasStarted: boolean;
  isConnected: boolean;
  isTyping: boolean;
  csTyping: boolean;
  queuePosition: number | null;
  assignedCs?: {
    id: string;
    name: string;
    avatarUrl?: string | null;
  } | null;
}
