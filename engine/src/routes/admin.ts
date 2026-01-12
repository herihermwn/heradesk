import { validateToken } from "../services/AuthService";
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getAllCsWithStats,
} from "../services/UserService";
import { getAllChats, getChatStats, getSessionById } from "../services/ChatService";
import { prisma } from "../config/database";
import type { UserRole, ChatStatus } from "@prisma/client";

// ============================================
// HELPER FUNCTIONS
// ============================================

async function getAuthAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);
  const payload = await validateToken(token);

  if (!payload || payload.role !== "admin") {
    return null;
  }

  return payload;
}

// ============================================
// USER MANAGEMENT ROUTES
// ============================================

/**
 * GET /api/admin/users
 * Get all users with pagination
 */
export async function handleGetUsers(req: Request): Promise<Response> {
  try {
    const admin = await getAuthAdmin(req);
    if (!admin) {
      return Response.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const role = url.searchParams.get("role") as UserRole | null;

    const result = await getAllUsers(page, limit, role || undefined);

    return Response.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[Admin] Get users error:", error);
    return Response.json(
      { success: false, message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/users/:id
 * Get user by ID
 */
export async function handleGetUserById(req: Request): Promise<Response> {
  try {
    const admin = await getAuthAdmin(req);
    if (!admin) {
      return Response.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const userId = pathParts[pathParts.length - 1];

    if (!userId) {
      return Response.json(
        { success: false, message: "User ID tidak valid" },
        { status: 400 }
      );
    }

    const user = await getUserById(userId);

    if (!user) {
      return Response.json(
        { success: false, message: "User tidak ditemukan" },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("[Admin] Get user error:", error);
    return Response.json(
      { success: false, message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/users
 * Create new user
 */
export async function handleCreateUser(req: Request): Promise<Response> {
  try {
    const admin = await getAuthAdmin(req);
    if (!admin) {
      return Response.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { username, password, name, role, avatarUrl } = body;

    if (!username || !password || !name || !role) {
      return Response.json(
        { success: false, message: "Data tidak lengkap" },
        { status: 400 }
      );
    }

    if (!["admin", "cs"].includes(role)) {
      return Response.json(
        { success: false, message: "Role tidak valid" },
        { status: 400 }
      );
    }

    const result = await createUser({
      username,
      password,
      name,
      role,
      avatarUrl,
    });

    if (!result.success) {
      return Response.json(
        { success: false, message: result.message },
        { status: 400 }
      );
    }

    return Response.json({
      success: true,
      message: "User berhasil dibuat",
      user: result.user,
    });
  } catch (error) {
    console.error("[Admin] Create user error:", error);
    return Response.json(
      { success: false, message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/users/:id
 * Update user
 */
export async function handleUpdateUser(req: Request): Promise<Response> {
  try {
    const admin = await getAuthAdmin(req);
    if (!admin) {
      return Response.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const userId = pathParts[pathParts.length - 1];

    if (!userId) {
      return Response.json(
        { success: false, message: "User ID tidak valid" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const result = await updateUser(userId, body);

    if (!result.success) {
      return Response.json(
        { success: false, message: result.message },
        { status: 400 }
      );
    }

    return Response.json({
      success: true,
      message: "User berhasil diperbarui",
      user: result.user,
    });
  } catch (error) {
    console.error("[Admin] Update user error:", error);
    return Response.json(
      { success: false, message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users/:id
 * Delete user (soft delete)
 */
export async function handleDeleteUser(req: Request): Promise<Response> {
  try {
    const admin = await getAuthAdmin(req);
    if (!admin) {
      return Response.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const userId = pathParts[pathParts.length - 1];

    if (!userId) {
      return Response.json(
        { success: false, message: "User ID tidak valid" },
        { status: 400 }
      );
    }

    // Prevent self-deletion
    if (userId === admin.userId) {
      return Response.json(
        { success: false, message: "Anda tidak dapat menghapus akun sendiri" },
        { status: 400 }
      );
    }

    const result = await deleteUser(userId);

    if (!result.success) {
      return Response.json(
        { success: false, message: result.message },
        { status: 400 }
      );
    }

    return Response.json({
      success: true,
      message: "User berhasil dihapus",
    });
  } catch (error) {
    console.error("[Admin] Delete user error:", error);
    return Response.json(
      { success: false, message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

// ============================================
// CHAT MANAGEMENT ROUTES
// ============================================

/**
 * GET /api/admin/chats
 * Get all chats with pagination and filters
 */
export async function handleGetAllChats(req: Request): Promise<Response> {
  try {
    const admin = await getAuthAdmin(req);
    if (!admin) {
      return Response.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const status = url.searchParams.get("status") as ChatStatus | null;

    const result = await getAllChats(page, limit, status || undefined);

    return Response.json({
      success: true,
      ...result,
      chats: result.chats.map((chat) => ({
        id: chat.id,
        customerName: chat.customerName,
        customerEmail: chat.customerEmail,
        status: chat.status,
        assignedCs: chat.assignedCs,
        messageCount: chat._count.messages,
        rating: chat.rating,
        createdAt: chat.createdAt,
        resolvedAt: chat.resolvedAt,
        lastMessage: chat.messages[0]
          ? {
              content: chat.messages[0].content,
              senderType: chat.messages[0].senderType,
              createdAt: chat.messages[0].createdAt,
            }
          : null,
      })),
    });
  } catch (error) {
    console.error("[Admin] Get all chats error:", error);
    return Response.json(
      { success: false, message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/chats/:id
 * Get chat detail with messages
 */
export async function handleGetChatById(req: Request): Promise<Response> {
  try {
    const admin = await getAuthAdmin(req);
    if (!admin) {
      return Response.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const chatId = pathParts[pathParts.length - 1];

    if (!chatId) {
      return Response.json(
        { success: false, message: "Chat ID tidak valid" },
        { status: 400 }
      );
    }

    const chat = await getSessionById(chatId);

    if (!chat) {
      return Response.json(
        { success: false, message: "Chat tidak ditemukan" },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      chat: {
        id: chat.id,
        customerName: chat.customerName,
        customerEmail: chat.customerEmail,
        status: chat.status,
        assignedCs: chat.assignedCs
          ? {
              id: chat.assignedCs.id,
              name: chat.assignedCs.name,
              avatarUrl: chat.assignedCs.avatarUrl,
            }
          : null,
        rating: chat.rating,
        feedback: chat.feedback,
        createdAt: chat.createdAt,
        assignedAt: chat.assignedAt,
        resolvedAt: chat.resolvedAt,
        messages: chat.messages,
      },
    });
  } catch (error) {
    console.error("[Admin] Get chat by ID error:", error);
    return Response.json(
      { success: false, message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

// ============================================
// STATISTICS ROUTES
// ============================================

/**
 * GET /api/admin/stats
 * Get dashboard statistics
 */
export async function handleGetStats(req: Request): Promise<Response> {
  try {
    const admin = await getAuthAdmin(req);
    if (!admin) {
      return Response.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const stats = await getChatStats();

    // Get online CS count
    const onlineCS = await prisma.csStatus.count({
      where: {
        status: { in: ["online", "busy"] },
      },
    });

    return Response.json({
      success: true,
      stats: {
        ...stats,
        onlineCS,
      },
    });
  } catch (error) {
    console.error("[Admin] Get stats error:", error);
    return Response.json(
      { success: false, message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/cs-status
 * Get all CS with their status
 */
export async function handleGetCsStatus(req: Request): Promise<Response> {
  try {
    const admin = await getAuthAdmin(req);
    if (!admin) {
      return Response.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const csUsers = await getAllCsWithStats();

    return Response.json({
      success: true,
      csUsers: csUsers.map((cs) => ({
        id: cs.id,
        username: cs.username,
        name: cs.name,
        avatarUrl: cs.avatarUrl,
        isActive: cs.isActive,
        status: cs.csStatus?.status || "offline",
        currentChats: cs.csStatus?.currentChats || 0,
        maxChats: cs.csStatus?.maxChats || 5,
        lastActiveAt: cs.csStatus?.lastActiveAt,
        totalChats: cs.totalChats,
        avgRating: cs.avgRating,
      })),
    });
  } catch (error) {
    console.error("[Admin] Get CS status error:", error);
    return Response.json(
      { success: false, message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

// ============================================
// ACTIVITY LOGS ROUTES
// ============================================

/**
 * GET /api/admin/logs
 * Get activity logs
 */
export async function handleGetLogs(req: Request): Promise<Response> {
  try {
    const admin = await getAuthAdmin(req);
    if (!admin) {
      return Response.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const userId = url.searchParams.get("userId");

    const skip = (page - 1) * limit;
    const where = userId ? { userId } : {};

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
        },
      }),
      prisma.activityLog.count({ where }),
    ]);

    return Response.json({
      success: true,
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("[Admin] Get logs error:", error);
    return Response.json(
      { success: false, message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

// ============================================
// SETTINGS ROUTES
// ============================================

/**
 * GET /api/admin/settings
 * Get system settings
 */
export async function handleGetSettings(req: Request): Promise<Response> {
  try {
    const admin = await getAuthAdmin(req);
    if (!admin) {
      return Response.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get settings from database or return defaults
    const settings = {
      maxChatsPerCs: 5,
      autoAssignment: true,
      businessHoursEnabled: false,
      businessHoursStart: "08:00",
      businessHoursEnd: "17:00",
      offlineMessage: "Terima kasih sudah menghubungi kami. Saat ini kami sedang offline. Silakan tinggalkan pesan dan kami akan menghubungi Anda segera.",
      welcomeMessage: "Halo! Selamat datang di layanan kami. Ada yang bisa kami bantu?",
    };

    return Response.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error("[Admin] Get settings error:", error);
    return Response.json(
      { success: false, message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/settings
 * Update system settings
 */
export async function handleUpdateSettings(req: Request): Promise<Response> {
  try {
    const admin = await getAuthAdmin(req);
    if (!admin) {
      return Response.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();

    // TODO: Save settings to database
    // For now, just log the activity
    await prisma.activityLog.create({
      data: {
        userId: admin.userId,
        action: "settings_updated",
        details: JSON.stringify(body),
      },
    });

    return Response.json({
      success: true,
      message: "Pengaturan berhasil diperbarui",
      settings: body,
    });
  } catch (error) {
    console.error("[Admin] Update settings error:", error);
    return Response.json(
      { success: false, message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

// ============================================
// CANNED RESPONSES MANAGEMENT
// ============================================

/**
 * GET /api/admin/canned-responses
 * Get all canned responses (global)
 */
export async function handleGetAllCannedResponses(req: Request): Promise<Response> {
  try {
    const admin = await getAuthAdmin(req);
    if (!admin) {
      return Response.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const responses = await prisma.cannedResponse.findMany({
      where: { isGlobal: true },
      orderBy: [{ category: "asc" }, { title: "asc" }],
    });

    return Response.json({
      success: true,
      responses,
    });
  } catch (error) {
    console.error("[Admin] Get canned responses error:", error);
    return Response.json(
      { success: false, message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/canned-responses
 * Create global canned response
 */
export async function handleCreateGlobalCannedResponse(req: Request): Promise<Response> {
  try {
    const admin = await getAuthAdmin(req);
    if (!admin) {
      return Response.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { title, content, shortcut, category } = body;

    if (!title || !content) {
      return Response.json(
        { success: false, message: "Title dan content wajib diisi" },
        { status: 400 }
      );
    }

    const response = await prisma.cannedResponse.create({
      data: {
        title,
        content,
        shortcut,
        category,
        createdBy: admin.userId,
        isGlobal: true,
      },
    });

    return Response.json({
      success: true,
      message: "Canned response berhasil dibuat",
      response,
    });
  } catch (error) {
    console.error("[Admin] Create canned response error:", error);
    return Response.json(
      { success: false, message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/canned-responses/:id
 * Update canned response
 */
export async function handleUpdateCannedResponse(req: Request): Promise<Response> {
  try {
    const admin = await getAuthAdmin(req);
    if (!admin) {
      return Response.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const responseId = pathParts[pathParts.length - 1];

    if (!responseId) {
      return Response.json(
        { success: false, message: "ID tidak valid" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { title, content, shortcut, category } = body;

    const response = await prisma.cannedResponse.update({
      where: { id: responseId },
      data: {
        title,
        content,
        shortcut,
        category,
      },
    });

    return Response.json({
      success: true,
      message: "Canned response berhasil diperbarui",
      response,
    });
  } catch (error) {
    console.error("[Admin] Update canned response error:", error);
    return Response.json(
      { success: false, message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/canned-responses/:id
 * Delete canned response
 */
export async function handleDeleteCannedResponse(req: Request): Promise<Response> {
  try {
    const admin = await getAuthAdmin(req);
    if (!admin) {
      return Response.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const responseId = pathParts[pathParts.length - 1];

    if (!responseId) {
      return Response.json(
        { success: false, message: "ID tidak valid" },
        { status: 400 }
      );
    }

    await prisma.cannedResponse.delete({
      where: { id: responseId },
    });

    return Response.json({
      success: true,
      message: "Canned response berhasil dihapus",
    });
  } catch (error) {
    console.error("[Admin] Delete canned response error:", error);
    return Response.json(
      { success: false, message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
