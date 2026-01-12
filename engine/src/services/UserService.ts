import { prisma } from "../config/database";
import type { UserRole, CsState } from "@prisma/client";

// ============================================
// TYPES
// ============================================

export interface CreateUserInput {
  username: string;
  password: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
}

export interface UpdateUserInput {
  username?: string;
  password?: string;
  name?: string;
  role?: UserRole;
  avatarUrl?: string;
  isActive?: boolean;
}

export interface UserWithStatus {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  csStatus: {
    status: CsState;
    maxChats: number;
    currentChats: number;
    lastActiveAt: Date;
  } | null;
}

// ============================================
// USER CRUD FUNCTIONS
// ============================================

/**
 * Create a new user (admin or CS)
 */
export async function createUser(input: CreateUserInput) {
  // Check if username already exists
  const existing = await prisma.user.findUnique({
    where: { username: input.username },
  });

  if (existing) {
    return { success: false, message: "Username sudah digunakan" };
  }

  // Hash password
  const passwordHash = await Bun.password.hash(input.password);

  // Create user
  const user = await prisma.user.create({
    data: {
      username: input.username,
      passwordHash,
      name: input.name,
      role: input.role,
      avatarUrl: input.avatarUrl,
    },
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      avatarUrl: true,
      isActive: true,
      createdAt: true,
    },
  });

  // Create CS status if role is CS
  if (input.role === "cs") {
    await prisma.csStatus.create({
      data: {
        userId: user.id,
        status: "offline",
        maxChats: 5,
        currentChats: 0,
      },
    });
  }

  // Log activity
  await prisma.activityLog.create({
    data: {
      action: "user_created",
      details: JSON.stringify({ userId: user.id, username: user.username }),
    },
  });

  return { success: true, user };
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<UserWithStatus | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      avatarUrl: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      csStatus: {
        select: {
          status: true,
          maxChats: true,
          currentChats: true,
          lastActiveAt: true,
        },
      },
    },
  });
}

/**
 * Get all users
 */
export async function getAllUsers(
  page: number = 1,
  limit: number = 20,
  role?: UserRole
) {
  const skip = (page - 1) * limit;
  const where = role ? { role } : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        avatarUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        csStatus: {
          select: {
            status: true,
            maxChats: true,
            currentChats: true,
            lastActiveAt: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get all CS users
 */
export async function getAllCS() {
  return prisma.user.findMany({
    where: { role: "cs" },
    orderBy: { name: "asc" },
    select: {
      id: true,
      username: true,
      name: true,
      avatarUrl: true,
      isActive: true,
      csStatus: {
        select: {
          status: true,
          maxChats: true,
          currentChats: true,
          lastActiveAt: true,
        },
      },
    },
  });
}

/**
 * Get online CS users
 */
export async function getOnlineCS() {
  return prisma.user.findMany({
    where: {
      role: "cs",
      isActive: true,
      csStatus: {
        status: { in: ["online", "busy"] },
      },
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      csStatus: {
        select: {
          status: true,
          maxChats: true,
          currentChats: true,
        },
      },
    },
  });
}

/**
 * Get available CS (online and has capacity)
 */
export async function getAvailableCS() {
  return prisma.user.findMany({
    where: {
      role: "cs",
      isActive: true,
      csStatus: {
        status: "online",
        currentChats: {
          lt: prisma.csStatus.fields.maxChats,
        },
      },
    },
    orderBy: {
      csStatus: {
        currentChats: "asc",
      },
    },
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      csStatus: {
        select: {
          status: true,
          maxChats: true,
          currentChats: true,
        },
      },
    },
  });
}

/**
 * Update user
 */
export async function updateUser(userId: string, input: UpdateUserInput) {
  // Check if user exists
  const existing = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!existing) {
    return { success: false, message: "User tidak ditemukan" };
  }

  // Check username uniqueness if changing
  if (input.username && input.username !== existing.username) {
    const usernameExists = await prisma.user.findUnique({
      where: { username: input.username },
    });
    if (usernameExists) {
      return { success: false, message: "Username sudah digunakan" };
    }
  }

  // Prepare update data
  const updateData: any = {};
  if (input.username) updateData.username = input.username;
  if (input.name) updateData.name = input.name;
  if (input.role) updateData.role = input.role;
  if (input.avatarUrl !== undefined) updateData.avatarUrl = input.avatarUrl;
  if (input.isActive !== undefined) updateData.isActive = input.isActive;

  // Hash password if provided
  if (input.password) {
    updateData.passwordHash = await Bun.password.hash(input.password);
  }

  // Update user
  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      avatarUrl: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // Handle role change
  if (input.role && input.role !== existing.role) {
    if (input.role === "cs") {
      // Create CS status if becoming CS
      await prisma.csStatus.upsert({
        where: { userId },
        create: {
          userId,
          status: "offline",
          maxChats: 5,
          currentChats: 0,
        },
        update: {},
      });
    } else if (existing.role === "cs") {
      // Delete CS status if no longer CS
      await prisma.csStatus.delete({
        where: { userId },
      }).catch(() => {}); // Ignore if doesn't exist
    }
  }

  // Log activity
  await prisma.activityLog.create({
    data: {
      action: "user_updated",
      details: JSON.stringify({ userId, changes: Object.keys(updateData) }),
    },
  });

  return { success: true, user };
}

/**
 * Delete user (soft delete - set isActive to false)
 */
export async function deleteUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return { success: false, message: "User tidak ditemukan" };
  }

  // Soft delete
  await prisma.user.update({
    where: { id: userId },
    data: { isActive: false },
  });

  // Set CS status to offline
  if (user.role === "cs") {
    await prisma.csStatus.update({
      where: { userId },
      data: { status: "offline" },
    }).catch(() => {});
  }

  // Log activity
  await prisma.activityLog.create({
    data: {
      action: "user_deleted",
      details: JSON.stringify({ userId, username: user.username }),
    },
  });

  return { success: true, message: "User berhasil dihapus" };
}

/**
 * Hard delete user (permanent)
 */
export async function hardDeleteUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return { success: false, message: "User tidak ditemukan" };
  }

  await prisma.user.delete({
    where: { id: userId },
  });

  return { success: true, message: "User berhasil dihapus permanen" };
}

// ============================================
// CS STATUS FUNCTIONS
// ============================================

/**
 * Get CS status
 */
export async function getCsStatus(userId: string) {
  return prisma.csStatus.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
    },
  });
}

/**
 * Update CS status
 */
export async function updateCsStatus(userId: string, status: CsState) {
  try {
    // First verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      console.error(`[UserService] User not found for status update: ${userId}`);
      return null;
    }

    const csStatus = await prisma.csStatus.upsert({
      where: { userId },
      update: {
        status,
        lastActiveAt: new Date(),
      },
      create: {
        userId,
        status,
        maxChats: 5,
        currentChats: 0,
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId,
        action: "status_changed",
        details: JSON.stringify({ status }),
      },
    });

    return csStatus;
  } catch (error) {
    console.error("[UserService] Update CS status error:", error);
    return null;
  }
}

/**
 * Update CS max chats setting
 */
export async function updateCsMaxChats(userId: string, maxChats: number) {
  return prisma.csStatus.update({
    where: { userId },
    data: { maxChats },
  });
}

// ============================================
// STATISTICS FUNCTIONS
// ============================================

/**
 * Get CS performance stats
 */
export async function getCsStats(csId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalChats, todayChats, resolvedToday, avgRating] = await Promise.all([
    prisma.chatSession.count({
      where: { assignedCsId: csId },
    }),
    prisma.chatSession.count({
      where: {
        assignedCsId: csId,
        assignedAt: { gte: today },
      },
    }),
    prisma.chatSession.count({
      where: {
        assignedCsId: csId,
        status: "resolved",
        resolvedAt: { gte: today },
      },
    }),
    prisma.chatSession.aggregate({
      where: {
        assignedCsId: csId,
        rating: { not: null },
      },
      _avg: { rating: true },
    }),
  ]);

  return {
    totalChats,
    todayChats,
    resolvedToday,
    avgRating: avgRating._avg.rating || 0,
  };
}

/**
 * Get all CS with their stats (for admin)
 */
export async function getAllCsWithStats() {
  const csUsers = await prisma.user.findMany({
    where: { role: "cs" },
    select: {
      id: true,
      username: true,
      name: true,
      avatarUrl: true,
      isActive: true,
      csStatus: true,
      _count: {
        select: {
          assignedChats: true,
        },
      },
    },
  });

  // Get ratings for each CS
  const csWithStats = await Promise.all(
    csUsers.map(async (cs) => {
      const avgRating = await prisma.chatSession.aggregate({
        where: {
          assignedCsId: cs.id,
          rating: { not: null },
        },
        _avg: { rating: true },
      });

      return {
        ...cs,
        totalChats: cs._count.assignedChats,
        avgRating: avgRating._avg.rating || 0,
      };
    })
  );

  return csWithStats;
}
