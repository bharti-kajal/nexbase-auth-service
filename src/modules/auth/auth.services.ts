import crypto from "node:crypto";
import { hashPassword, verifyPassword, performDummyVerification } from "../../utils/password.ts";
import type { RegisterInput, LoginInput } from "./auth.schema.ts";
import { prisma } from "../../config/db.ts";

export interface User {
  id: string;
  email: string;
  name?: string | null;
  passwordHash: string;
  role: "USER" | "ADMIN";
  isVerified: boolean;
  tokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

// In-memory fallback if PostgreSQL is not currently running locally
const memoryUsersByEmail = new Map<string, User>();
const memoryUsersById = new Map<string, User>();

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

export class AuthService {
  /**
   * Register a new user with secure password hashing.
   */
  async register(input: RegisterInput): Promise<Omit<User, "passwordHash">> {
    const dbOk = await checkDb();

    if (dbOk) {
      const existing = await prisma.user.findUnique({
        where: { email: input.email }
      });
      if (existing) {
        throw new Error("EMAIL_ALREADY_EXISTS");
      }

      const passwordHash = await hashPassword(input.password);

      const created = await prisma.user.create({
        data: {
          email: input.email,
          name: input.name,
          passwordHash,
          role: "USER",
          isVerified: false,
          tokenVersion: 1
        }
      });

      const { passwordHash: _, ...safeUser } = created;
      return safeUser as Omit<User, "passwordHash">;
    }

    // Fallback to memory store
    if (memoryUsersByEmail.has(input.email)) {
      throw new Error("EMAIL_ALREADY_EXISTS");
    }

    const passwordHash = await hashPassword(input.password);

    const newUser: User = {
      id: crypto.randomUUID(),
      email: input.email,
      name: input.name,
      passwordHash,
      role: "USER",
      isVerified: false,
      tokenVersion: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    memoryUsersByEmail.set(newUser.email, newUser);
    memoryUsersById.set(newUser.id, newUser);

    const { passwordHash: _, ...safeUser } = newUser;
    return safeUser;
  }

  /**
   * Authenticate a user with timing-attack mitigation.
   */
  async login(input: LoginInput): Promise<Omit<User, "passwordHash">> {
    const dbOk = await checkDb();
    let user: User | null = null;

    if (dbOk) {
      const dbUser = await prisma.user.findUnique({
        where: { email: input.email }
      });
      if (dbUser) {
        user = dbUser as User;
      }
    } else {
      user = memoryUsersByEmail.get(input.email) || null;
    }

    if (!user) {
      // Execute dummy Argon2 hash to maintain constant response timing
      await performDummyVerification(input.password);
      throw new Error("INVALID_CREDENTIALS");
    }

    const isMatch = await verifyPassword(user.passwordHash, input.password);
    if (!isMatch) {
      throw new Error("INVALID_CREDENTIALS");
    }

    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }

  /**
   * Find user by ID.
   */
  async findById(id: string): Promise<Omit<User, "passwordHash"> | null> {
    const dbOk = await checkDb();

    if (dbOk) {
      const dbUser = await prisma.user.findUnique({ where: { id } });
      if (!dbUser) return null;
      const { passwordHash: _, ...safeUser } = dbUser;
      return safeUser as Omit<User, "passwordHash">;
    }

    const user = memoryUsersById.get(id);
    if (!user) return null;
    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }

  /**
   * Increment user's tokenVersion to instantly invalidate all active tokens.
   */
  async incrementTokenVersion(id: string): Promise<number | null> {
    const dbOk = await checkDb();

    if (dbOk) {
      const updated = await prisma.user.update({
        where: { id },
        data: { tokenVersion: { increment: 1 } }
      });
      return updated.tokenVersion;
    }

    const user = memoryUsersById.get(id);
    if (!user) return null;
    user.tokenVersion += 1;
    user.updatedAt = new Date();
    return user.tokenVersion;
  }
}

export const authService = new AuthService();
