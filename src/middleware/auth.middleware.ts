import type { FastifyRequest, FastifyReply } from "fastify";
import { tokenService, type AccessTokenPayload } from "../modules/auth/token.services.ts";
import { authService } from "../modules/auth/auth.services.ts";

// Augment FastifyRequest to include user property
declare module "fastify" {
  interface FastifyRequest {
    user?: AccessTokenPayload;
  }
}

/**
 * Authentication preHandler hook to protect routes.
 * Derives user identity strictly from the verified access token.
 */
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return reply.status(401).send({
      statusCode: 401,
      error: "Unauthorized",
      message: "Authorization header missing or invalid format"
    });
  }

  const token = authHeader.substring(7);

  try {
    const payload = tokenService.verifyAccessToken(token);

    // Verify token version against user record (immediate revocation check)
    const user = await authService.findById(payload.userId);
    if (!user || user.tokenVersion !== payload.tokenVersion) {
      return reply.status(401).send({
        statusCode: 401,
        error: "Unauthorized",
        message: "Session has expired or was revoked. Please log in again."
      });
    }

    request.user = payload;
  } catch (error: any) {
    return reply.status(401).send({
      statusCode: 401,
      error: "Unauthorized",
      message: error.name === "TokenExpiredError" ? "Access token has expired" : "Invalid access token"
    });
  }
}

