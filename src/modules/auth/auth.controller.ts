import type { FastifyRequest, FastifyReply } from "fastify";
import { registerSchema, loginSchema } from "./auth.schema.ts";
import { authService } from "./auth.services.ts";
import { tokenService } from "./token.services.ts";
import { env } from "../../config/env.ts";

const COOKIE_OPTIONS = {
  path: "/api/auth",
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: 7 * 24 * 60 * 60 // 7 days in seconds
};

export async function registerHandler(request: FastifyRequest, reply: FastifyReply) {
  const result = registerSchema.safeParse(request.body);
  if (!result.success) {
    return reply.status(400).send({
      statusCode: 400,
      error: "Bad Request",
      message: "Validation failed",
      details: result.error.issues.map(err => ({
        field: err.path.join("."),
        message: err.message
      }))
    });
  }

  try {
    const user = await authService.register(result.data);

    // Issue initial session & tokens
    const { accessToken, refreshToken } = await tokenService.createSession(
      user,
      request.headers["user-agent"],
      request.ip
    );

    reply.setCookie("refreshToken", refreshToken, COOKIE_OPTIONS);

    return reply.status(201).send({
      statusCode: 201,
      message: "User registered successfully",
      data: {
        user,
        accessToken
      }
    });
  } catch (error: any) {
    if (error.message === "EMAIL_ALREADY_EXISTS") {
      return reply.status(409).send({
        statusCode: 409,
        error: "Conflict",
        message: "An account with this email already exists"
      });
    }

    request.log.error(error);
    return reply.status(500).send({
      statusCode: 500,
      error: "Internal Server Error",
      message: "An unexpected error occurred"
    });
  }
}

export async function loginHandler(request: FastifyRequest, reply: FastifyReply) {
  const result = loginSchema.safeParse(request.body);
  if (!result.success) {
    return reply.status(400).send({
      statusCode: 400,
      error: "Bad Request",
      message: "Invalid input",
      details: result.error.issues.map(err => ({
        field: err.path.join("."),
        message: err.message
      }))
    });
  }

  try {
    const user = await authService.login(result.data);

    // Create session with single-use refresh token
    const { accessToken, refreshToken } = await tokenService.createSession(
      user,
      request.headers["user-agent"],
      request.ip
    );

    reply.setCookie("refreshToken", refreshToken, COOKIE_OPTIONS);

    return reply.status(200).send({
      statusCode: 200,
      message: "Login successful",
      data: {
        user,
        accessToken
      }
    });
  } catch (error: any) {
    if (error.message === "INVALID_CREDENTIALS") {
      return reply.status(401).send({
        statusCode: 401,
        error: "Unauthorized",
        message: "Invalid email or password"
      });
    }

    request.log.error(error);
    return reply.status(500).send({
      statusCode: 500,
      error: "Internal Server Error",
      message: "An unexpected error occurred"
    });
  }
}

/**
 * Single-use Refresh Token Rotation (RTR) endpoint
 */
export async function refreshHandler(request: FastifyRequest, reply: FastifyReply) {
  // Read refresh token from HttpOnly cookie, or fall back to body (for non-browser clients)
  const refreshToken =
    request.cookies.refreshToken ||
    (request.body as { refreshToken?: string } | undefined)?.refreshToken;

  if (!refreshToken) {
    return reply.status(401).send({
      statusCode: 401,
      error: "Unauthorized",
      message: "Refresh token missing"
    });
  }

  try {
    const { accessToken, refreshToken: newRefreshToken } = await tokenService.rotateRefreshToken(
      refreshToken,
      request.headers["user-agent"],
      request.ip
    );

    // Set new rotated refresh token in cookie
    reply.setCookie("refreshToken", newRefreshToken, COOKIE_OPTIONS);

    return reply.status(200).send({
      statusCode: 200,
      message: "Token refreshed successfully",
      data: {
        accessToken
      }
    });
  } catch (error: any) {
    // Clear cookie on any refresh failure
    reply.clearCookie("refreshToken", { path: "/api/auth" });

    if (error.message === "TOKEN_REUSE_DETECTED") {
      request.log.warn({ ip: request.ip }, "SECURITY ALERT: Refresh token reuse detected!");
      return reply.status(401).send({
        statusCode: 401,
        error: "Unauthorized",
        message: "Security alert: suspicious activity detected. All active sessions have been invalidated. Please log in again."
      });
    }

    return reply.status(401).send({
      statusCode: 401,
      error: "Unauthorized",
      message: "Session expired or invalid. Please log in again."
    });
  }
}

/**
 * Logout current session
 */
export async function logoutHandler(request: FastifyRequest, reply: FastifyReply) {
  const refreshToken =
    request.cookies.refreshToken ||
    (request.body as { refreshToken?: string } | undefined)?.refreshToken;

  if (refreshToken) {
    await tokenService.revokeSession(refreshToken);
  }

  reply.clearCookie("refreshToken", { path: "/api/auth" });

  return reply.status(200).send({
    statusCode: 200,
    message: "Logged out successfully"
  });
}

/**
 * Invalidate all sessions across all devices for the authenticated user
 */
export async function logoutAllHandler(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.user!.userId;
  await tokenService.revokeAllUserSessions(userId);

  reply.clearCookie("refreshToken", { path: "/api/auth" });

  return reply.status(200).send({
    statusCode: 200,
    message: "All sessions have been terminated successfully"
  });
}

/**
 * Get current user profile (Protected route)
 */
export async function meHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = await authService.findById(request.user!.userId);
  if (!user) {
    return reply.status(404).send({
      statusCode: 404,
      error: "Not Found",
      message: "User not found"
    });
  }

  return reply.status(200).send({
    statusCode: 200,
    data: { user }
  });
}
