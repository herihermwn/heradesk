import { config } from "./config/env";
import { connectDatabase } from "./config/database";
import { websocketHandler } from "./websocket/handler";
import { handleLogin, handleLogout, handleGetMe } from "./routes/auth";

// Import HTML pages
import landing from "../../dashboard/src/pages/Landing.html";
import csApp from "../../dashboard/src/pages/cs/Dashboard.html";
import adminApp from "../../dashboard/src/pages/admin/Dashboard.html";
import loginPage from "../../dashboard/src/pages/auth/Login.html";

// Connect to database
await connectDatabase();

console.log(`[HeraDesk] Starting server...`);

const server = Bun.serve({
  port: config.server.port,
  hostname: config.server.host,

  routes: {
    // Landing page (customer chat widget)
    "/": landing,

    // Auth pages
    "/login": loginPage,

    // CS Dashboard
    "/cs": csApp,
    "/cs/*": csApp,

    // Admin Dashboard
    "/admin": adminApp,
    "/admin/*": adminApp,

    // API Routes
    "/api/health": () =>
      Response.json({
        status: "ok",
        timestamp: new Date().toISOString(),
      }),

    // Auth API
    "/api/auth/login": {
      POST: handleLogin,
    },
    "/api/auth/logout": {
      POST: handleLogout,
    },
    "/api/auth/me": {
      GET: handleGetMe,
    },

    // Chat API (for anonymous customers)
    "/api/chat/init": {
      POST: async (req) => {
        // TODO: Implement chat initialization
        return Response.json({ message: "Chat init endpoint" });
      },
    },
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

console.log(`[HeraDesk] Server running at http://${config.server.host}:${config.server.port}`);
console.log(`[HeraDesk] Environment: ${config.server.isDev ? "development" : "production"}`);
