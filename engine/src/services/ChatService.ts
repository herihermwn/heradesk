import { prisma } from "../config/database";
import type { ChatStatus, SenderType, MessageType } from "@prisma/client";

// ============================================
// TYPES
// ============================================

export interface InitChatResult {
  success: boolean;
  message: string;
  sessionId?: string;
  customerToken?: string;
}

export interface SendMessageResult {
  success: boolean;
  message: string;
  messageId?: string;
}

export interface ChatSessionWithMessages {
  id: string;
  customerName: string | null;
  customerEmail: string | null;
  customerToken: string;
  status: ChatStatus;
  assignedCsId: string | null;
  assignedCs: {
    id: string;
    name: string;
    avatarUrl: string | null;
  } | null;
  createdAt: Date;
  assignedAt: Date | null;
  resolvedAt: Date | null;
  rating: number | null;
  feedback: string | null;
  messages: {
    id: string;
    content: string;
    senderType: SenderType;
    senderId: string | null;
    messageType: MessageType;
    isRead: boolean;
    createdAt: Date;
  }[];
}

// ============================================
// CHAT SESSION FUNCTIONS
// ============================================

/**
 * Initialize a new chat session for anonymous customer
 */
export async function initChat(
  customerName?: string,
  customerEmail?: string,
  sourceUrl?: string,
  userAgent?: string,
  ipAddress?: string
): Promise<InitChatResult> {
  try {
    // Generate unique customer token
    const customerToken = generateCustomerToken();

    // Create chat session
    const session = await prisma.chatSession.create({
      data: {
        customerName,
        customerEmail,
        customerToken,
        sourceUrl,
        userAgent,
        ipAddress,
        status: "waiting",
      },
    });

    // Create system message
    await prisma.message.create({
      data: {
        sessionId: session.id,
        senderType: "system",
        content: "Chat started. Waiting for customer service...",
        messageType: "system",
      },
    });

    return {
      success: true,
      message: "Chat started successfully",
      sessionId: session.id,
      customerToken,
    };
  } catch (error) {
    console.error("[ChatService] Init chat error:", error);
    return {
      success: false,
      message: "Failed to start chat",
    };
  }
}

/**
 * Get chat session by customer token
 */
export async function getSessionByToken(
  customerToken: string
): Promise<ChatSessionWithMessages | null> {
  return prisma.chatSession.findUnique({
    where: { customerToken },
    include: {
      assignedCs: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          content: true,
          senderType: true,
          senderId: true,
          messageType: true,
          isRead: true,
          createdAt: true,
        },
      },
    },
  });
}

/**
 * Get chat session by ID
 */
export async function getSessionById(
  sessionId: string
): Promise<ChatSessionWithMessages | null> {
  return prisma.chatSession.findUnique({
    where: { id: sessionId },
    include: {
      assignedCs: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          content: true,
          senderType: true,
          senderId: true,
          messageType: true,
          isRead: true,
          createdAt: true,
        },
      },
    },
  });
}

/**
 * Get waiting chat sessions (queue)
 */
export async function getWaitingChats() {
  return prisma.chatSession.findMany({
    where: { status: "waiting" },
    orderBy: { createdAt: "asc" },
    include: {
      messages: {
        take: 1,
        orderBy: { createdAt: "desc" },
        where: { senderType: "customer" },
      },
    },
  });
}

/**
 * Get active chats for a CS
 */
export async function getActiveChatsForCS(csId: string) {
  return prisma.chatSession.findMany({
    where: {
      assignedCsId: csId,
      status: "active",
    },
    orderBy: { assignedAt: "desc" },
    include: {
      messages: {
        take: 1,
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

/**
 * Get chat history for a CS
 */
export async function getChatHistoryForCS(
  csId: string,
  page: number = 1,
  limit: number = 20
) {
  const skip = (page - 1) * limit;

  const [chats, total] = await Promise.all([
    prisma.chatSession.findMany({
      where: {
        assignedCsId: csId,
        status: { in: ["resolved", "abandoned"] },
      },
      orderBy: { resolvedAt: "desc" },
      skip,
      take: limit,
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: { messages: true },
        },
      },
    }),
    prisma.chatSession.count({
      where: {
        assignedCsId: csId,
        status: { in: ["resolved", "abandoned"] },
      },
    }),
  ]);

  return {
    chats,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Assign chat to a CS
 */
export async function assignChat(sessionId: string, csId: string) {
  // Update chat session
  const session = await prisma.chatSession.update({
    where: { id: sessionId },
    data: {
      assignedCsId: csId,
      status: "active",
      assignedAt: new Date(),
    },
    include: {
      assignedCs: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
    },
  });

  // Increment CS current chats
  await prisma.csStatus.update({
    where: { userId: csId },
    data: {
      currentChats: { increment: 1 },
    },
  });

  // Create system message
  await prisma.message.create({
    data: {
      sessionId,
      senderType: "system",
      content: `${session.assignedCs?.name || "Customer Service"} has joined the chat`,
      messageType: "system",
    },
  });

  return session;
}

/**
 * Resolve a chat session
 */
export async function resolveChat(sessionId: string, csId: string) {
  const session = await prisma.chatSession.findUnique({
    where: { id: sessionId },
  });

  if (!session || session.assignedCsId !== csId) {
    return null;
  }

  // Update chat session
  const updated = await prisma.chatSession.update({
    where: { id: sessionId },
    data: {
      status: "resolved",
      resolvedAt: new Date(),
    },
  });

  // Decrement CS current chats
  await prisma.csStatus.update({
    where: { userId: csId },
    data: {
      currentChats: { decrement: 1 },
    },
  });

  // Create system message
  await prisma.message.create({
    data: {
      sessionId,
      senderType: "system",
      content: "Chat has been resolved",
      messageType: "system",
    },
  });

  // Log activity
  await prisma.activityLog.create({
    data: {
      userId: csId,
      action: "chat_resolved",
      details: JSON.stringify({ sessionId }),
    },
  });

  return updated;
}

/**
 * Transfer chat to another CS
 */
export async function transferChat(
  sessionId: string,
  fromCsId: string,
  toCsId: string
) {
  const session = await prisma.chatSession.findUnique({
    where: { id: sessionId },
  });

  if (!session || session.assignedCsId !== fromCsId) {
    return null;
  }

  // Get new CS info
  const newCs = await prisma.user.findUnique({
    where: { id: toCsId },
    select: { id: true, name: true },
  });

  if (!newCs) {
    return null;
  }

  // Update chat session
  const updated = await prisma.chatSession.update({
    where: { id: sessionId },
    data: {
      assignedCsId: toCsId,
    },
  });

  // Update CS current chats
  await Promise.all([
    prisma.csStatus.update({
      where: { userId: fromCsId },
      data: { currentChats: { decrement: 1 } },
    }),
    prisma.csStatus.update({
      where: { userId: toCsId },
      data: { currentChats: { increment: 1 } },
    }),
  ]);

  // Create system message
  await prisma.message.create({
    data: {
      sessionId,
      senderType: "system",
      content: `Chat transferred to ${newCs.name}`,
      messageType: "system",
    },
  });

  return updated;
}

/**
 * End chat (customer leaves)
 */
export async function endChat(sessionId: string) {
  const session = await prisma.chatSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    return null;
  }

  // Update status to abandoned if still waiting/active
  if (session.status === "waiting" || session.status === "active") {
    const updated = await prisma.chatSession.update({
      where: { id: sessionId },
      data: {
        status: "abandoned",
        resolvedAt: new Date(),
      },
    });

    // Decrement CS current chats if assigned
    if (session.assignedCsId) {
      await prisma.csStatus.update({
        where: { userId: session.assignedCsId },
        data: { currentChats: { decrement: 1 } },
      });
    }

    // Create system message
    await prisma.message.create({
      data: {
        sessionId,
        senderType: "system",
        content: "Customer has left the chat",
        messageType: "system",
      },
    });

    return updated;
  }

  return session;
}

/**
 * Submit rating for a chat session
 */
export async function submitRating(
  customerToken: string,
  rating: number,
  feedback?: string
) {
  const session = await prisma.chatSession.findUnique({
    where: { customerToken },
  });

  if (!session || session.status !== "resolved") {
    return null;
  }

  return prisma.chatSession.update({
    where: { customerToken },
    data: {
      rating,
      feedback,
    },
  });
}

// ============================================
// MESSAGE FUNCTIONS
// ============================================

/**
 * Send a message in a chat session
 */
export async function sendMessage(
  sessionId: string,
  senderType: SenderType,
  content: string,
  senderId?: string,
  messageType: MessageType = "text"
): Promise<SendMessageResult> {
  try {
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return { success: false, message: "Chat session not found" };
    }

    if (session.status !== "waiting" && session.status !== "active") {
      return { success: false, message: "Chat has ended" };
    }

    const message = await prisma.message.create({
      data: {
        sessionId,
        senderType,
        senderId,
        content,
        messageType,
      },
    });

    return {
      success: true,
      message: "Message sent",
      messageId: message.id,
    };
  } catch (error) {
    console.error("[ChatService] Send message error:", error);
    return { success: false, message: "Failed to send message" };
  }
}

/**
 * Mark messages as read
 */
export async function markMessagesAsRead(sessionId: string, userId?: string) {
  // Mark all messages from the other party as read
  const senderType = userId ? "customer" : "cs";

  await prisma.message.updateMany({
    where: {
      sessionId,
      senderType,
      isRead: false,
    },
    data: {
      isRead: true,
    },
  });
}

/**
 * Get unread message count for a session
 */
export async function getUnreadCount(sessionId: string, senderType: SenderType) {
  return prisma.message.count({
    where: {
      sessionId,
      senderType,
      isRead: false,
    },
  });
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate unique customer token
 */
function generateCustomerToken(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `cust_${timestamp}${randomPart}`;
}

/**
 * Get all chat sessions (for admin)
 */
export async function getAllChats(
  page: number = 1,
  limit: number = 20,
  status?: ChatStatus
) {
  const skip = (page - 1) * limit;
  const where = status ? { status } : {};

  const [chats, total] = await Promise.all([
    prisma.chatSession.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        assignedCs: {
          select: {
            id: true,
            name: true,
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: { messages: true },
        },
      },
    }),
    prisma.chatSession.count({ where }),
  ]);

  return {
    chats,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get chat statistics
 */
export async function getChatStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalChats,
    activeChats,
    waitingChats,
    todayChats,
    resolvedToday,
    avgRating,
  ] = await Promise.all([
    prisma.chatSession.count(),
    prisma.chatSession.count({ where: { status: "active" } }),
    prisma.chatSession.count({ where: { status: "waiting" } }),
    prisma.chatSession.count({
      where: { createdAt: { gte: today } },
    }),
    prisma.chatSession.count({
      where: {
        status: "resolved",
        resolvedAt: { gte: today },
      },
    }),
    prisma.chatSession.aggregate({
      where: { rating: { not: null } },
      _avg: { rating: true },
    }),
  ]);

  return {
    totalChats,
    activeChats,
    waitingChats,
    todayChats,
    resolvedToday,
    avgRating: avgRating._avg.rating || 0,
  };
}
