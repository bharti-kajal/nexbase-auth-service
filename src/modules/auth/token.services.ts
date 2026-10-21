import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.ts";
import { authService, type User } from "./auth.services.ts";
import { prisma } from "../../config/db.ts";

export interface RefreshTokenRecord {
  id: string;
  userId: string;
  familyId: string;
  isRevoked: boolean;
  expiresAt: Date;
  createdAt: Date;
  userAgent?: string | null;
  ipAddress?: string | null;
}

export interface AccessTokenPayload {
  userId: string;
  email: string;
  role: "USER" | "ADMIN";
  tokenVersion: number;
}

export interface RefreshTokenPayload {
  tokenId: string;
  familyId: string;
  userId: string;
  tokenVersion: number;
}

// In-memory fallback if PostgreSQL is not currently running
const memoryRefreshTokens = new Map<string, RefreshTokenRecord>();

let isDbAvailable: boolean | null = null;

async function checkDb(): Promise<boolean> {
  if (isDbAvailable !== null) return isDbAvailable;
  try {
    await prisma.$queryRaw`SELECT 1`;
    isDbAvailable = true;
  } catch {
    isDbAvailable = false;
  }
  return isDbAvailable;
}

export class TokenService {
  /**
   * Generate short-lived Access Token (e.g. 15 minutes)
   */
  signAccessToken(user: Omit<User, "passwordHash">): string {
    const payload: AccessTokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion
    };

    return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: "15m"
    });
  }

  /**
   * Verify an Access Token
   */
  verifyAccessToken(token: string): AccessTokenPayload {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
  }

  /**
   * Create an initial session on login (Family ID + Single-use Refresh Token)
   */
  async createSession(
    user: Omit<User, "passwordHash">,
    userAgent?: string,
    ipAddress?: string
  ): Promise<{ accessToken: string; refreshToken: string; familyId: string }> {
    const familyId = crypto.randomUUID();
    const tokenId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const dbOk = await checkDb();
    if (dbOk) {
      await prisma.refreshToken.create({
        data: {
          id: tokenId,
          userId: user.id,
          familyId,
          isRevoked: false,
          expiresAt,
          userAgent,
          ipAddress
        }
      });
    } else {
      memoryRefreshTokens.set(tokenId, {
        id: tokenId,
        userId: user.id,
        familyId,
        isRevoked: false,
        expiresAt,
        createdAt: new Date(),
        userAgent,
        ipAddress
      });
    }

    const refreshTokenPayload: RefreshTokenPayload = {
      tokenId,
      familyId,
      userId: user.id,
      tokenVersion: user.tokenVersion
    };

    const refreshToken = jwt.sign(refreshTokenPayload, env.JWT_REFRESH_SECRET, {
      expiresIn: "7d"
    });

    const accessToken = this.signAccessToken(user);

    return { accessToken, refreshToken, familyId };
  }

  /**
   * Rotate a Refresh Token (Single-Use with Replay / Theft Detection)
   */
  async rotateRefreshToken(
    rawToken: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<{ accessToken: string; refreshToken: string; user: Omit<User, "passwordHash"> }> {
    let payload: RefreshTokenPayload;
    try {
      payload = jwt.verify(rawToken, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
    } catch {
      throw new Error("INVALID_OR_EXPIRED_TOKEN");
    }

    const user = await authService.findById(payload.userId);
    if (!user || user.tokenVersion !== payload.tokenVersion) {
      throw new Error("SESSION_REVOKED");
    }

    const dbOk = await checkDb();
    let tokenRecord: RefreshTokenRecord | null = null;

    if (dbOk) {
      tokenRecord = (await prisma.refreshToken.findUnique({
        where: { id: payload.tokenId }
      })) as RefreshTokenRecord | null;
    } else {
      tokenRecord = memoryRefreshTokens.get(payload.tokenId) || null;
    }

    if (!tokenRecord) {
      throw new Error("TOKEN_NOT_FOUND");
    }

    // BREACH / REPLAY DETECTION
    if (tokenRecord.isRevoked) {
      // Replay detected: Revoke entire session family
      await this.revokeTokenFamily(tokenRecord.familyId);
      throw new Error("TOKEN_REUSE_DETECTED");
    }

    // Invalidate the presented token (single-use)
    if (dbOk) {
      await prisma.refreshToken.update({
        where: { id: payload.tokenId },
        data: { isRevoked: true }
      });
    } else {
      tokenRecord.isRevoked = true;
    }

    // Issue a NEW refresh token linked to the SAME family
    const newTokenId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    if (dbOk) {
      await prisma.refreshToken.create({
        data: {
          id: newTokenId,
          userId: user.id,
          familyId: tokenRecord.familyId,
          isRevoked: false,
          expiresAt,
          userAgent: userAgent || tokenRecord.userAgent,
          ipAddress: ipAddress || tokenRecord.ipAddress
        }
      });
    } else {
      memoryRefreshTokens.set(newTokenId, {
        id: newTokenId,
        userId: user.id,
        familyId: tokenRecord.familyId,
        isRevoked: false,
        expiresAt,
        createdAt: new Date(),
        userAgent: userAgent || tokenRecord.userAgent,
        ipAddress: ipAddress || tokenRecord.ipAddress
      });
    }

    const newRefreshPayload: RefreshTokenPayload = {
      tokenId: newTokenId,
      familyId: tokenRecord.familyId,
      userId: user.id,
      tokenVersion: user.tokenVersion
    };

    const newRefreshToken = jwt.sign(newRefreshPayload, env.JWT_REFRESH_SECRET, {
      expiresIn: "7d"
    });

    const newAccessToken = this.signAccessToken(user);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user
    };
  }

  /**
   * Revoke a single refresh token / session
   */
  async revokeSession(rawToken: string): Promise<void> {
    try {
      const payload = jwt.verify(rawToken, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
      const dbOk = await checkDb();

      if (dbOk) {
        const record = await prisma.refreshToken.findUnique({ where: { id: payload.tokenId } });
        if (record) {
          await this.revokeTokenFamily(record.familyId);
        }
      } else {
        const record = memoryRefreshTokens.get(payload.tokenId);
        if (record) {
          await this.revokeTokenFamily(record.familyId);
        }
      }
    } catch {
      // Ignore if token is already invalid
    }
  }

  /**
   * Invalidate all refresh tokens belonging to a family
   */
  async revokeTokenFamily(familyId: string): Promise<void> {
    const dbOk = await checkDb();
    if (dbOk) {
      await prisma.refreshToken.updateMany({
        where: { familyId },
        data: { isRevoked: true }
      });
    } else {
      for (const record of memoryRefreshTokens.values()) {
        if (record.familyId === familyId) {
          record.isRevoked = true;
        }
      }
    }
  }

  /**
   * Invalidate all sessions for a user (e.g. on password change or "Log out all devices")
   */
  async revokeAllUserSessions(userId: string): Promise<void> {
    await authService.incrementTokenVersion(userId);
    const dbOk = await checkDb();

    if (dbOk) {
      await prisma.refreshToken.updateMany({
        where: { userId },
        data: { isRevoked: true }
      });
    } else {
      for (const record of memoryRefreshTokens.values()) {
        if (record.userId === userId) {
          record.isRevoked = true;
        }
      }
    }
  }
}

export const tokenService = new TokenService();
