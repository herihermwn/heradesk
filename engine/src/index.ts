import { config } from "./config/env";
import { connectDatabase } from "./config/database";
import { websocketHandler } from "./websocket/handler";
import { setServer } from "./services/NotificationService";
import { verifyToken } from "./utils/jwt";

// Auth routes
import { handleLogin, handleLogout, handleGetMe } from "./routes/auth";

// Chat routes (customer)
import {
  handleChatInit,
  handleGetSession,
  handleSubmitRating,
  handleGetQueue,
} from "./routes/chat";

// CS routes
import {
  handleGetCsStatus,
  handleUpdateCsStatus,
  handleGetCsChats,
  handleGetChatDetail,
  handleGetCsHistory,
  handleGetCsQueue,
  handleAcceptChat,
  handleResolveChat,
  handleTransferChat,
  handleGetOnlineCS,
  handleGetCsStats,
  handleGetCannedResponses,
  handleCreateCannedResponse,
  handleDeleteCannedResponse,
} from "./routes/cs";

// Admin routes
import {
  handleGetUsers,
  handleGetUserById,
  handleCreateUser,
  handleUpdateUser,
  handleDeleteUser,
  handleGetAllChats,
  handleGetChatById,
  handleGetStats,
  handleGetCsStatus as handleAdminGetCsStatus,
  handleGetLogs,
  handleGetSettings,
  handleUpdateSettings,
  handleGetAllCannedResponses,
  handleCreateGlobalCannedResponse,
  handleUpdateCannedResponse,
  handleDeleteCannedResponse as handleAdminDeleteCannedResponse,
} from "./routes/admin";

// Import HTML pages
import landing from "../../dashboard/src/pages/Landing.html";
import csApp from "../../dashboard/src/pages/cs/Dashboard.html";
import csHistoryApp from "../../dashboard/src/pages/cs/History.html";
import adminApp from "../../dashboard/src/pages/admin/Dashboard.html";
import adminUsersApp from "../../dashboard/src/pages/admin/Users.html";
import adminChatsApp from "../../dashboard/src/pages/admin/ChatLogs.html";
import adminSettingsApp from "../../dashboard/src/pages/admin/Settings.html";
import loginPage from "../../dashboard/src/pages/auth/Login.html";

// Connect to database
await connectDatabase();

console.log(`[HeraDesk] Starting server...`);

const server = Bun.serve({
  port: config.server.port,
  hostname: config.server.host,

  routes: {
    // ============================================
    // PAGES
    // ============================================

    // Landing page (customer chat widget)
    "/": landing,

    // Auth pages
    "/login": loginPage,

    // CS Dashboard
    "/cs": csApp,
    "/cs/history": csHistoryApp,
    "/cs/*": csApp,

    // Admin Dashboard
    "/admin": adminApp,
    "/admin/users": adminUsersApp,
    "/admin/chats": adminChatsApp,
    "/admin/settings": adminSettingsApp,
    "/admin/*": adminApp,

    // ============================================
    // API ROUTES
    // ============================================

    // Health check
    "/api/health": () =>
      Response.json({
        status: "ok",
        timestamp: new Date().toISOString(),
      }),

    // ----------------------------------------
    // Auth API
    // ----------------------------------------
    "/api/auth/login": {
      POST: handleLogin,
    },
    "/api/auth/logout": {
      POST: handleLogout,
    },
    "/api/auth/me": {
      GET: handleGetMe,
    },

    // ----------------------------------------
    // Chat API (for anonymous customers)
    // ----------------------------------------
    "/api/chat/init": {
      POST: handleChatInit,
    },
    "/api/chat/queue": {
      GET: handleGetQueue,
    },
    "/api/chat/rating": {
      POST: handleSubmitRating,
    },

    // ----------------------------------------
    // CS API
    // ----------------------------------------
    "/api/cs/status": {
      GET: handleGetCsStatus,
      PUT: handleUpdateCsStatus,
    },
    "/api/cs/chats": {
      GET: handleGetCsChats,
    },
    "/api/cs/history": {
      GET: handleGetCsHistory,
    },
    "/api/cs/queue": {
      GET: handleGetCsQueue,
    },
    "/api/cs/online": {
      GET: handleGetOnlineCS,
    },
    "/api/cs/stats": {
      GET: handleGetCsStats,
    },
    "/api/cs/canned-responses": {
      GET: handleGetCannedResponses,
      POST: handleCreateCannedResponse,
    },

    // ----------------------------------------
    // Admin API
    // ----------------------------------------
    "/api/admin/users": {
      GET: handleGetUsers,
      POST: handleCreateUser,
    },
    "/api/admin/chats": {
      GET: handleGetAllChats,
    },
    "/api/admin/stats": {
      GET: handleGetStats,
    },
    "/api/admin/cs-status": {
      GET: handleAdminGetCsStatus,
    },
    "/api/admin/logs": {
      GET: handleGetLogs,
    },
    "/api/admin/settings": {
      GET: handleGetSettings,
      PUT: handleUpdateSettings,
    },
    "/api/admin/canned-responses": {
      GET: handleGetAllCannedResponses,
      POST: handleCreateGlobalCannedResponse,
    },
  },

  // Handle dynamic routes
  async fetch(req, server) {
    const url = new URL(req.url);
    const pathname = url.pathname;

    // ----------------------------------------
    // WebSocket upgrade
    // ----------------------------------------
    if (pathname.startsWith("/ws/")) {
      const wsPath = pathname.slice(4); // Remove "/ws/"
      const token = url.searchParams.get("token");

      let role: "customer" | "cs" | "admin";
      let userId: string | undefined;
      let sessionId: string | undefined;
      let customerToken: string | undefined;

      if (wsPath === "chat" || wsPath.startsWith("chat/") || wsPath === "customer" || wsPath.startsWith("customer/")) {
        // Customer WebSocket
        role = "customer";
        customerToken = token || undefined;
      } else if (wsPath === "cs" || wsPath.startsWith("cs/")) {
        // CS WebSocket - requires JWT token
        role = "cs";
        if (token) {
          const payload = await verifyToken(token);
          if (payload && payload.role === "cs") {
            userId = payload.userId;
          } else {
            return new Response("Invalid or expired token", { status: 401 });
          }
        } else {
          return new Response("Token required", { status: 401 });
        }
      } else if (wsPath === "admin" || wsPath.startsWith("admin/")) {
        // Admin WebSocket - requires JWT token
        role = "admin";
        if (token) {
          const payload = await verifyToken(token);
          if (payload && payload.role === "admin") {
            userId = payload.userId;
          } else {
            return new Response("Invalid or expired token", { status: 401 });
          }
        } else {
          return new Response("Token required", { status: 401 });
        }
      } else {
        return new Response("Invalid WebSocket path", { status: 404 });
      }

      const upgraded = server.upgrade(req, {
        data: {
          role,
          userId,
          sessionId,
          customerToken,
        },
      });

      if (upgraded) {
        return undefined;
      }
      return new Response("WebSocket upgrade failed", { status: 500 });
    }

    // ----------------------------------------
    // Dynamic API routes
    // ----------------------------------------

    // GET /api/chat/session/:token
    if (
      req.method === "GET" &&
      pathname.startsWith("/api/chat/session/")
    ) {
      return handleGetSession(req);
    }

    // GET /api/cs/chats/:id
    if (
      req.method === "GET" &&
      pathname.match(/^\/api\/cs\/chats\/[^\/]+$/)
    ) {
      return handleGetChatDetail(req);
    }

    // POST /api/cs/chats/:id/accept
    if (
      req.method === "POST" &&
      pathname.match(/^\/api\/cs\/chats\/[^\/]+\/accept$/)
    ) {
      return handleAcceptChat(req);
    }

    // POST /api/cs/chats/:id/resolve
    if (
      req.method === "POST" &&
      pathname.match(/^\/api\/cs\/chats\/[^\/]+\/resolve$/)
    ) {
      return handleResolveChat(req);
    }

    // POST /api/cs/chats/:id/transfer
    if (
      req.method === "POST" &&
      pathname.match(/^\/api\/cs\/chats\/[^\/]+\/transfer$/)
    ) {
      return handleTransferChat(req);
    }

    // DELETE /api/cs/canned-responses/:id
    if (
      req.method === "DELETE" &&
      pathname.match(/^\/api\/cs\/canned-responses\/[^\/]+$/)
    ) {
      return handleDeleteCannedResponse(req);
    }

    // ----------------------------------------
    // Admin dynamic routes
    // ----------------------------------------

    // GET /api/admin/users/:id
    if (
      req.method === "GET" &&
      pathname.match(/^\/api\/admin\/users\/[^\/]+$/)
    ) {
      return handleGetUserById(req);
    }

    // PUT /api/admin/users/:id
    if (
      req.method === "PUT" &&
      pathname.match(/^\/api\/admin\/users\/[^\/]+$/)
    ) {
      return handleUpdateUser(req);
    }

    // DELETE /api/admin/users/:id
    if (
      req.method === "DELETE" &&
      pathname.match(/^\/api\/admin\/users\/[^\/]+$/)
    ) {
      return handleDeleteUser(req);
    }

    // GET /api/admin/chats/:id
    if (
      req.method === "GET" &&
      pathname.match(/^\/api\/admin\/chats\/[^\/]+$/)
    ) {
      return handleGetChatById(req);
    }

    // PUT /api/admin/canned-responses/:id
    if (
      req.method === "PUT" &&
      pathname.match(/^\/api\/admin\/canned-responses\/[^\/]+$/)
    ) {
      return handleUpdateCannedResponse(req);
    }

    // DELETE /api/admin/canned-responses/:id
    if (
      req.method === "DELETE" &&
      pathname.match(/^\/api\/admin\/canned-responses\/[^\/]+$/)
    ) {
      return handleAdminDeleteCannedResponse(req);
    }

    // 404 for unmatched API routes
    if (pathname.startsWith("/api/")) {
      return Response.json(
        { success: false, message: "Not found" },
        { status: 404 }
      );
    }

    // Handle favicon
    if (pathname === "/favicon.ico") {
      return new Response(null, { status: 204 });
    }

    // Handle static assets (CSS, JS, images)
    if (pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)) {
      // Let Bun's static file handler deal with it
      return undefined;
    }

    // For any other unmatched route, return 404
    return new Response("Not Found", { status: 404 });
  },

  // WebSocket handling
  websocket: websocketHandler,

  // Development mode
  development: config.server.isDev
    ? {
        hmr: true,
        console: true,
      }
    : false,
});

// Set server instance for NotificationService
setServer(server);

console.log(`[HeraDesk] Server running at http://${config.server.host}:${config.server.port}`);
console.log(`[HeraDesk] Environment: ${config.server.isDev ? "development" : "production"}`);

// Export server for testing
export { server };
