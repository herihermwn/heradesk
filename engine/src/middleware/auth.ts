import { validateToken } from "../services/AuthService";

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    username: string;
    role: "admin" | "cs";
  };
}

export async function authMiddleware(
  req: Request
): Promise<{ success: true; user: AuthenticatedRequest["user"] } | { success: false; response: Response }> {
  const authHeader = req.headers.get("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return {
      success: false,
      response: Response.json(
        { success: false, message: "Token tidak ditemukan" },
        { status: 401 }
      ),
    };
  }

  const token = authHeader.slice(7);
  const payload = await validateToken(token);

  if (!payload) {
    return {
      success: false,
      response: Response.json(
        { success: false, message: "Token tidak valid atau sudah kadaluarsa" },
        { status: 401 }
      ),
    };
  }

  return {
    success: true,
    user: {
      userId: payload.userId,
      username: payload.username,
      role: payload.role,
    },
  };
}

export function requireRole(...roles: ("admin" | "cs")[]) {
  return async (
    req: Request
  ): Promise<{ success: true; user: AuthenticatedRequest["user"] } | { success: false; response: Response }> => {
    const authResult = await authMiddleware(req);

    if (!authResult.success) {
      return authResult;
    }

    if (!roles.includes(authResult.user!.role)) {
      return {
        success: false,
        response: Response.json(
          { success: false, message: "Akses ditolak" },
          { status: 403 }
        ),
      };
    }

    return authResult;
  };
}
