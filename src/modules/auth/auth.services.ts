import crypto from "node:crypto";
import { hashPassword, verifyPassword, performDummyVerification } from "../../utils/password.ts";
import type { RegisterInput, LoginInput } from "./auth.schema.ts";

export interface User {
  id: string;
  email: string;
  name?: string;
  passwordHash: string;
  role: "user" | "admin";
  isVerified: boolean;
  tokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

// Temporary in-memory user repository (will connect to PostgreSQL in Phase 2)
const usersByEmail = new Map<string, User>();
const usersById = new Map<string, User>();

export class AuthService {
  /**
   * Register a new user with secure password hashing.
   */
  async register(input: RegisterInput): Promise<Omit<User, "passwordHash">> {
    if (usersByEmail.has(input.email)) {
      throw new Error("EMAIL_ALREADY_EXISTS");
    }

    const passwordHash = await hashPassword(input.password);

    const newUser: User = {
      id: crypto.randomUUID(),
      email: input.email,
      name: input.name,
      passwordHash,
      role: "user",
      isVerified: false,
      tokenVersion: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    usersByEmail.set(newUser.email, newUser);
    usersById.set(newUser.id, newUser);

    const { passwordHash: _, ...safeUser } = newUser;
    return safeUser;
  }

  /**
   * Authenticate a user with timing-attack mitigation.
   */
  async login(input: LoginInput): Promise<Omit<User, "passwordHash">> {
    const user = usersByEmail.get(input.email);

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
    const user = usersById.get(id);
    if (!user) return null;
    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }
}

export const authService = new AuthService();

