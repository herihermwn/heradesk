import { prisma } from "../config/database";
import { signToken, verifyToken } from "../utils/jwt";

export interface LoginResult {
  success: boolean;
  message: string;
  token?: string;
  user?: {
    id: string;
    username: string;
    name: string;
    role: "admin" | "cs";
  };
}

export async function login(username: string, password: string): Promise<LoginResult> {
  // Find user by username
  const user = await prisma.user.findUnique({
    where: { username },
  });

  if (!user) {
    return { success: false, message: "Invalid username or password" };
  }

  if (!user.isActive) {
    return { success: false, message: "Account is inactive" };
  }

  // Verify password
  const isValidPassword = await Bun.password.verify(password, user.passwordHash);
  if (!isValidPassword) {
    return { success: false, message: "Invalid username or password" };
  }

  // Generate JWT token
  const token = await signToken({
    userId: user.id,
    username: user.username,
    role: user.role,
  });

  // Update CS status to online if role is CS
  if (user.role === "cs") {
    await prisma.csStatus.upsert({
      where: { userId: user.id },
      update: { status: "online", lastActiveAt: new Date() },
      create: {
        userId: user.id,
        status: "online",
        maxChats: 5,
        currentChats: 0,
      },
    });
  }

  // Log activity
  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: "login",
      details: JSON.stringify({ username: user.username }),
    },
  });

  return {
    success: true,
    message: "Login successful",
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    },
  };
}

export async function logout(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (user?.role === "cs") {
    await prisma.csStatus.update({
      where: { userId },
      data: { status: "offline", lastActiveAt: new Date() },
    });
  }

  await prisma.activityLog.create({
    data: {
      userId,
      action: "logout",
    },
  });
}

export async function validateToken(token: string) {
  return verifyToken(token);
}

export async function getUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      isActive: true,
      avatarUrl: true,
    },
  });
}
