import type { ServerWebSocket } from "bun";
import type { WebSocketData } from "./handler";

// ============================================
// TOPIC/ROOM NAMING CONVENTIONS
// ============================================

/**
 * Topic names for pub/sub
 */
export const TOPICS = {
  /**
   * Individual chat session
   * Pattern: session:{sessionId}
   */
  session: (sessionId: string) => `session:${sessionId}`,

  /**
   * CS-specific notifications
   * Pattern: cs:{userId}
   */
  cs: (userId: string) => `cs:${userId}`,

  /**
   * Waiting queue updates (all CS receive)
   */
  queue: "queue",

  /**
   * Admin statistics (all admins receive)
   */
  adminStats: "admin:stats",

  /**
   * System-wide broadcasts
   */
  broadcast: "broadcast",
} as const;

// ============================================
// ROOM MANAGEMENT
// ============================================

/**
 * Subscribe client to appropriate rooms based on role
 */
export function subscribeToRooms(ws: ServerWebSocket<WebSocketData>): void {
  const { role, userId, sessionId } = ws.data;

  switch (role) {
    case "customer":
      if (sessionId) {
        ws.subscribe(TOPICS.session(sessionId));
      }
      break;

    case "cs":
      if (userId) {
        ws.subscribe(TOPICS.cs(userId));
        ws.subscribe(TOPICS.queue);
      }
      break;

    case "admin":
      ws.subscribe(TOPICS.adminStats);
      ws.subscribe(TOPICS.queue);
      break;
  }

  // All clients can receive broadcasts
  ws.subscribe(TOPICS.broadcast);
}

/**
 * Unsubscribe client from all rooms
 */
export function unsubscribeFromRooms(ws: ServerWebSocket<WebSocketData>): void {
  const { role, userId, sessionId } = ws.data;

  switch (role) {
    case "customer":
      if (sessionId) {
        ws.unsubscribe(TOPICS.session(sessionId));
      }
      break;

    case "cs":
      if (userId) {
        ws.unsubscribe(TOPICS.cs(userId));
        ws.unsubscribe(TOPICS.queue);
      }
      break;

    case "admin":
      ws.unsubscribe(TOPICS.adminStats);
      ws.unsubscribe(TOPICS.queue);
      break;
  }

  ws.unsubscribe(TOPICS.broadcast);
}

/**
 * Subscribe CS to a specific chat session (when accepting chat)
 */
export function subscribeCsToSession(
  ws: ServerWebSocket<WebSocketData>,
  sessionId: string
): void {
  ws.subscribe(TOPICS.session(sessionId));
}

/**
 * Unsubscribe CS from a specific chat session (when chat ends)
 */
export function unsubscribeCsFromSession(
  ws: ServerWebSocket<WebSocketData>,
  sessionId: string
): void {
  ws.unsubscribe(TOPICS.session(sessionId));
}

/**
 * Subscribe customer to a new session
 */
export function subscribeCustomerToSession(
  ws: ServerWebSocket<WebSocketData>,
  sessionId: string
): void {
  // Update ws.data with new session ID
  ws.data.sessionId = sessionId;
  ws.subscribe(TOPICS.session(sessionId));
}

// ============================================
// CONNECTION TRACKING
// ============================================

// Track active connections (in-memory store)
const activeConnections = new Map<
  string,
  {
    ws: ServerWebSocket<WebSocketData>;
    role: "customer" | "cs" | "admin";
    userId?: string;
    sessionId?: string;
    connectedAt: Date;
  }
>();

/**
 * Generate unique connection ID
 */
function generateConnectionId(): string {
  return `conn_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Track new connection
 */
export function trackConnection(ws: ServerWebSocket<WebSocketData>): string {
  const connectionId = generateConnectionId();
  activeConnections.set(connectionId, {
    ws,
    role: ws.data.role,
    userId: ws.data.userId,
    sessionId: ws.data.sessionId,
    connectedAt: new Date(),
  });
  return connectionId;
}

/**
 * Remove connection from tracking
 */
export function untrackConnection(connectionId: string): void {
  activeConnections.delete(connectionId);
}

/**
 * Get all connections for a user (CS/Admin)
 */
export function getConnectionsByUserId(
  userId: string
): ServerWebSocket<WebSocketData>[] {
  const connections: ServerWebSocket<WebSocketData>[] = [];
  for (const conn of activeConnections.values()) {
    if (conn.userId === userId) {
      connections.push(conn.ws);
    }
  }
  return connections;
}

/**
 * Get connection for a session (customer)
 */
export function getConnectionBySessionId(
  sessionId: string
): ServerWebSocket<WebSocketData> | undefined {
  for (const conn of activeConnections.values()) {
    if (conn.sessionId === sessionId && conn.role === "customer") {
      return conn.ws;
    }
  }
  return undefined;
}

/**
 * Get all online CS connections
 */
export function getOnlineCsConnections(): ServerWebSocket<WebSocketData>[] {
  const connections: ServerWebSocket<WebSocketData>[] = [];
  for (const conn of activeConnections.values()) {
    if (conn.role === "cs") {
      connections.push(conn.ws);
    }
  }
  return connections;
}

/**
 * Get all admin connections
 */
export function getAdminConnections(): ServerWebSocket<WebSocketData>[] {
  const connections: ServerWebSocket<WebSocketData>[] = [];
  for (const conn of activeConnections.values()) {
    if (conn.role === "admin") {
      connections.push(conn.ws);
    }
  }
  return connections;
}

/**
 * Get connection stats
 */
export function getConnectionStats(): {
  total: number;
  customers: number;
  cs: number;
  admins: number;
} {
  let customers = 0;
  let cs = 0;
  let admins = 0;

  for (const conn of activeConnections.values()) {
    switch (conn.role) {
      case "customer":
        customers++;
        break;
      case "cs":
        cs++;
        break;
      case "admin":
        admins++;
        break;
    }
  }

  return {
    total: activeConnections.size,
    customers,
    cs,
    admins,
  };
}

/**
 * Check if user is connected
 */
export function isUserConnected(userId: string): boolean {
  for (const conn of activeConnections.values()) {
    if (conn.userId === userId) {
      return true;
    }
  }
  return false;
}

/**
 * Check if customer session is connected
 */
export function isSessionConnected(sessionId: string): boolean {
  for (const conn of activeConnections.values()) {
    if (conn.sessionId === sessionId && conn.role === "customer") {
      return true;
    }
  }
  return false;
}

/**
 * Subscribe CS to session by user ID (for when chat is assigned)
 */
export function subscribeCsToSessionByUserId(
  userId: string,
  sessionId: string
): boolean {
  const connections = getConnectionsByUserId(userId);
  if (connections.length === 0) {
    return false;
  }

  for (const ws of connections) {
    ws.subscribe(TOPICS.session(sessionId));
  }

  return true;
}
