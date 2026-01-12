import { prisma } from "../config/database";
import { config } from "../config/env";
import { assignChat, getWaitingChats } from "./ChatService";
import { notifyChatAssigned } from "./NotificationService";
import { subscribeCsToSessionByUserId } from "../websocket/rooms";

// ============================================
// TYPES
// ============================================

export interface QueueItem {
  sessionId: string;
  customerName: string | null;
  customerEmail: string | null;
  position: number;
  waitTime: number; // in seconds
  createdAt: Date;
  lastMessage?: string;
}

export interface QueueStats {
  totalWaiting: number;
  avgWaitTime: number;
  oldestWaitTime: number;
}

// ============================================
// QUEUE FUNCTIONS
// ============================================

/**
 * Get current queue with positions
 */
export async function getQueue(): Promise<QueueItem[]> {
  const waitingChats = await getWaitingChats();
  const now = Date.now();

  return waitingChats.map((chat, index) => ({
    sessionId: chat.id,
    customerName: chat.customerName,
    customerEmail: chat.customerEmail,
    position: index + 1,
    waitTime: Math.floor((now - chat.createdAt.getTime()) / 1000),
    createdAt: chat.createdAt,
    lastMessage: chat.messages[0]?.content,
  }));
}

/**
 * Get queue position for a specific session
 */
export async function getQueuePosition(sessionId: string): Promise<number | null> {
  const queue = await getQueue();
  const item = queue.find((q) => q.sessionId === sessionId);
  return item ? item.position : null;
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<QueueStats> {
  const queue = await getQueue();
  const now = Date.now();

  if (queue.length === 0) {
    return {
      totalWaiting: 0,
      avgWaitTime: 0,
      oldestWaitTime: 0,
    };
  }

  const waitTimes = queue.map((q) => q.waitTime);
  const avgWaitTime = waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length;
  const oldestWaitTime = Math.max(...waitTimes);

  return {
    totalWaiting: queue.length,
    avgWaitTime: Math.floor(avgWaitTime),
    oldestWaitTime,
  };
}

/**
 * Auto-assign chat to available CS
 * Returns the assigned CS info or null if no CS available
 */
export async function autoAssignChat(sessionId: string) {
  if (!config.features.autoAssignEnabled) {
    return null;
  }

  // Get available CS (online and has capacity)
  const availableCS = await prisma.user.findMany({
    where: {
      role: "cs",
      isActive: true,
      csStatus: {
        status: "online",
      },
    },
    include: {
      csStatus: true,
    },
    orderBy: {
      csStatus: {
        currentChats: "asc",
      },
    },
  });

  // Filter CS with available capacity
  const csWithCapacity = availableCS.filter(
    (cs) => cs.csStatus && cs.csStatus.currentChats < cs.csStatus.maxChats
  );

  if (csWithCapacity.length === 0) {
    return null;
  }

  // Assign to CS with least current chats
  const selectedCS = csWithCapacity[0];
  const session = await assignChat(sessionId, selectedCS.id);

  // Subscribe CS to session topic (for real-time messages)
  subscribeCsToSessionByUserId(selectedCS.id, sessionId);

  // Notify customer and CS about assignment
  notifyChatAssigned(sessionId, selectedCS.id, selectedCS.name, selectedCS.avatarUrl);

  return {
    session,
    cs: {
      id: selectedCS.id,
      name: selectedCS.name,
      avatarUrl: selectedCS.avatarUrl,
    },
  };
}

/**
 * Process queue - try to auto-assign waiting chats
 * Should be called periodically or when CS becomes available
 */
export async function processQueue() {
  if (!config.features.autoAssignEnabled) {
    return { processed: 0 };
  }

  const queue = await getQueue();
  let processed = 0;

  for (const item of queue) {
    const result = await autoAssignChat(item.sessionId);
    if (result) {
      processed++;
    } else {
      // No more CS available, stop processing
      break;
    }
  }

  return { processed };
}

/**
 * Check for idle chats and mark as abandoned
 * Should be called periodically
 */
export async function checkIdleChats() {
  const idleThreshold = new Date(
    Date.now() - config.features.chatIdleTimeout * 1000
  );

  // Find active chats with no recent messages
  const idleChats = await prisma.chatSession.findMany({
    where: {
      status: { in: ["waiting", "active"] },
      messages: {
        every: {
          createdAt: { lt: idleThreshold },
        },
      },
    },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  const abandonedIds: string[] = [];

  for (const chat of idleChats) {
    // Check if last message is older than threshold
    const lastMessage = chat.messages[0];
    if (!lastMessage || lastMessage.createdAt < idleThreshold) {
      // Mark as abandoned
      await prisma.chatSession.update({
        where: { id: chat.id },
        data: {
          status: "abandoned",
          resolvedAt: new Date(),
        },
      });

      // Decrement CS current chats if assigned
      if (chat.assignedCsId) {
        await prisma.csStatus.update({
          where: { userId: chat.assignedCsId },
          data: { currentChats: { decrement: 1 } },
        }).catch(() => {});
      }

      // Create system message
      await prisma.message.create({
        data: {
          sessionId: chat.id,
          senderType: "system",
          content: "Chat ditutup karena tidak ada aktivitas",
          messageType: "system",
        },
      });

      abandonedIds.push(chat.id);
    }
  }

  return { abandoned: abandonedIds.length, ids: abandonedIds };
}

/**
 * Get estimated wait time for new customer
 */
export async function getEstimatedWaitTime(): Promise<number> {
  const stats = await getQueueStats();

  // Get average CS capacity
  const csStats = await prisma.csStatus.aggregate({
    where: {
      status: "online",
    },
    _avg: {
      maxChats: true,
      currentChats: true,
    },
    _count: true,
  });

  if (!csStats._count || csStats._count === 0) {
    // No CS online, return high wait time
    return 300; // 5 minutes
  }

  const avgCapacity = (csStats._avg.maxChats || 5) - (csStats._avg.currentChats || 0);
  const onlineCS = csStats._count;
  const totalCapacity = avgCapacity * onlineCS;

  if (totalCapacity <= 0) {
    return stats.avgWaitTime + 60; // Add 1 minute buffer
  }

  // Estimate based on queue position and available capacity
  const estimatedTime = (stats.totalWaiting / totalCapacity) * 60; // 1 minute per chat average

  return Math.max(30, Math.floor(estimatedTime)); // Minimum 30 seconds
}

/**
 * Prioritize a chat in queue (move to front)
 */
export async function prioritizeChat(sessionId: string) {
  // We don't have a priority field, but we can update createdAt to move to front
  // This is a hack - in production, add a priority field to the schema
  const session = await prisma.chatSession.findUnique({
    where: { id: sessionId },
  });

  if (!session || session.status !== "waiting") {
    return null;
  }

  // Get the oldest waiting chat
  const oldest = await prisma.chatSession.findFirst({
    where: { status: "waiting" },
    orderBy: { createdAt: "asc" },
  });

  if (oldest && oldest.id !== sessionId) {
    // Set createdAt to be 1 second before the oldest
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: {
        createdAt: new Date(oldest.createdAt.getTime() - 1000),
      },
    });
  }

  return await getQueuePosition(sessionId);
}
