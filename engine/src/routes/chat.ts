import {
  initChat,
  getSessionByToken,
  submitRating,
} from "../services/ChatService";
import {
  getQueue,
  getQueuePosition,
  getEstimatedWaitTime,
  autoAssignChat,
} from "../services/QueueService";
import { notifyNewChatInQueue, notifyQueuePosition } from "../services/NotificationService";

// ============================================
// CUSTOMER CHAT ROUTES
// ============================================

/**
 * POST /api/chat/init
 * Initialize a new chat session for anonymous customer
 */
export async function handleChatInit(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}));
    const { customerName, customerEmail, sourceUrl } = body;

    // Get metadata from request
    const userAgent = req.headers.get("User-Agent") || undefined;
    const ipAddress =
      req.headers.get("X-Forwarded-For")?.split(",")[0].trim() ||
      req.headers.get("X-Real-IP") ||
      undefined;

    // Initialize chat session
    const result = await initChat(
      customerName,
      customerEmail,
      sourceUrl,
      userAgent,
      ipAddress
    );

    if (!result.success) {
      return Response.json(
        { success: false, message: result.message },
        { status: 500 }
      );
    }

    // Notify CS about new chat in queue
    notifyNewChatInQueue(result.sessionId!, customerName);

    // Try auto-assign
    const assigned = await autoAssignChat(result.sessionId!);

    // Get queue position if not assigned
    let queuePosition: number | null = null;
    let estimatedWaitTime: number | null = null;

    if (!assigned) {
      queuePosition = await getQueuePosition(result.sessionId!);
      estimatedWaitTime = await getEstimatedWaitTime();

      // Notify customer about queue position
      if (queuePosition) {
        notifyQueuePosition(result.sessionId!, queuePosition);
      }
    }

    return Response.json({
      success: true,
      message: result.message,
      sessionId: result.sessionId,
      customerToken: result.customerToken,
      assigned: assigned
        ? {
            cs: assigned.cs,
          }
        : null,
      queue: !assigned
        ? {
            position: queuePosition,
            estimatedWaitTime,
          }
        : null,
    });
  } catch (error) {
    console.error("[Chat] Init error:", error);
    return Response.json(
      { success: false, message: "Server error occurred" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/chat/session/:token
 * Get chat session by customer token
 */
export async function handleGetSession(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const token = pathParts[pathParts.length - 1];

    if (!token) {
      return Response.json(
        { success: false, message: "Invalid token" },
        { status: 400 }
      );
    }

    const session = await getSessionByToken(token);

    if (!session) {
      return Response.json(
        { success: false, message: "Session not found" },
        { status: 404 }
      );
    }

    // Get queue position if waiting
    let queuePosition: number | null = null;
    if (session.status === "waiting") {
      queuePosition = await getQueuePosition(session.id);
    }

    return Response.json({
      success: true,
      data: {
        session: {
          id: session.id,
          status: session.status,
          customerName: session.customerName,
          customerEmail: session.customerEmail,
          cs: session.assignedCs
            ? {
                id: session.assignedCs.id,
                name: session.assignedCs.name,
                avatarUrl: session.assignedCs.avatarUrl,
              }
            : null,
          createdAt: session.createdAt?.toISOString?.() || session.createdAt,
          assignedAt: session.assignedAt?.toISOString?.() || session.assignedAt,
          resolvedAt: session.resolvedAt?.toISOString?.() || session.resolvedAt,
          rating: session.rating,
          feedback: session.feedback,
          messages: session.messages?.map((m: any) => ({
            id: m.id,
            sessionId: m.sessionId,
            senderType: m.senderType,
            senderId: m.senderId,
            content: m.content,
            messageType: m.messageType,
            createdAt: m.createdAt?.toISOString?.() || m.createdAt,
          })),
          queuePosition,
        },
      },
    });
  } catch (error) {
    console.error("[Chat] Get session error:", error);
    return Response.json(
      { success: false, message: "Server error occurred" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/chat/rating
 * Submit rating for a chat session
 */
export async function handleSubmitRating(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const { customerToken, rating, feedback } = body;

    if (!customerToken) {
      return Response.json(
        { success: false, message: "Invalid token" },
        { status: 400 }
      );
    }

    if (!rating || rating < 1 || rating > 5) {
      return Response.json(
        { success: false, message: "Rating must be between 1-5" },
        { status: 400 }
      );
    }

    const result = await submitRating(customerToken, rating, feedback);

    if (!result) {
      return Response.json(
        { success: false, message: "Session not found atau belum selesai" },
        { status: 400 }
      );
    }

    return Response.json({
      success: true,
      message: "Rating saved successfully",
    });
  } catch (error) {
    console.error("[Chat] Submit rating error:", error);
    return Response.json(
      { success: false, message: "Server error occurred" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/chat/queue
 * Get current queue status (public info)
 */
export async function handleGetQueue(req: Request): Promise<Response> {
  try {
    const queue = await getQueue();
    const estimatedWaitTime = await getEstimatedWaitTime();

    return Response.json({
      success: true,
      queue: {
        count: queue.length,
        estimatedWaitTime,
      },
    });
  } catch (error) {
    console.error("[Chat] Get queue error:", error);
    return Response.json(
      { success: false, message: "Server error occurred" },
      { status: 500 }
    );
  }
}
