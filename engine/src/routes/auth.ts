import { login, logout, validateToken, getUserById } from "../services/AuthService";

export async function handleLogin(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return Response.json(
        { success: false, message: "Username dan password harus diisi" },
        { status: 400 }
      );
    }

    const result = await login(username, password);

    if (!result.success) {
      return Response.json(
        { success: false, message: result.message },
        { status: 401 }
      );
    }

    return Response.json({
      success: true,
      message: result.message,
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    console.error("[Auth] Login error:", error);
    return Response.json(
      { success: false, message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

export async function handleLogout(req: Request): Promise<Response> {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json(
        { success: false, message: "Token tidak valid" },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);
    const payload = await validateToken(token);

    if (!payload) {
      return Response.json(
        { success: false, message: "Token tidak valid" },
        { status: 401 }
      );
    }

    await logout(payload.userId);

    return Response.json({
      success: true,
      message: "Logout berhasil",
    });
  } catch (error) {
    console.error("[Auth] Logout error:", error);
    return Response.json(
      { success: false, message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

export async function handleGetMe(req: Request): Promise<Response> {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json(
        { success: false, message: "Token tidak valid" },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);
    const payload = await validateToken(token);

    if (!payload) {
      return Response.json(
        { success: false, message: "Token tidak valid atau sudah kadaluarsa" },
        { status: 401 }
      );
    }

    const user = await getUserById(payload.userId);

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
    console.error("[Auth] GetMe error:", error);
    return Response.json(
      { success: false, message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
