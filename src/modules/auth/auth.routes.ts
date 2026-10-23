import type { FastifyPluginAsync } from "fastify";
import {
  registerHandler,
  loginHandler,
  refreshHandler,
  logoutHandler,
  logoutAllHandler,
  meHandler
} from "./auth.controller.ts";
import { authenticate } from "../../middleware/auth.middleware.ts";

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // 1. POST /register
  fastify.post(
    "/register",
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "1 minute"
        }
      },
      schema: {
        tags: ["Authentication"],
        summary: "Register new user account",
        description:
          "Registers a new user, hashes the password using memory-hard Argon2id, generates an initial session with a single-use refresh token, and sets a secure HttpOnly cookie.",
        body: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: {
              type: "string",
              format: "email",
              example: "alice@example.com",
              description: "Valid email address (normalized to lowercase)"
            },
            password: {
              type: "string",
              minLength: 10,
              maxLength: 128,
              example: "StrongP@ssw0rd!123",
              description:
                "Must be 10–128 characters, containing uppercase, lowercase, digit, and special symbol"
            },
            name: {
              type: "string",
              minLength: 2,
              maxLength: 100,
              example: "Alice Smith",
              description: "User display name (optional)"
            }
          }
        },
        response: {
          201: {
            description: "User registered successfully",
            type: "object",
            properties: {
              statusCode: { type: "number", example: 201 },
              message: { type: "string", example: "User registered successfully" },
              data: {
                type: "object",
                properties: {
                  user: {
                    type: "object",
                    properties: {
                      id: { type: "string", format: "uuid" },
                      email: { type: "string" },
                      name: { type: "string", nullable: true },
                      role: { type: "string", example: "USER" },
                      isVerified: { type: "boolean" },
                      tokenVersion: { type: "number" },
                      createdAt: { type: "string", format: "date-time" },
                      updatedAt: { type: "string", format: "date-time" }
                    },
                    additionalProperties: true
                  },
                  accessToken: {
                    type: "string",
                    description: "Short-lived JWT (15 minutes) for Authorization header"
                  }
                }
              }
            }
          },
          400: {
            description: "Validation failed (weak password or malformed input)",
            type: "object",
            properties: {
              statusCode: { type: "number", example: 400 },
              error: { type: "string", example: "Bad Request" },
              message: { type: "string", example: "Validation failed" },
              details: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    field: { type: "string" },
                    message: { type: "string" }
                  }
                }
              }
            }
          },
          409: {
            description: "Email already registered",
            type: "object",
            properties: {
              statusCode: { type: "number", example: 409 },
              error: { type: "string", example: "Conflict" },
              message: { type: "string", example: "An account with this email already exists" }
            }
          }
        }
      }
    },
    registerHandler
  );

  // 2. POST /login
  fastify.post(
    "/login",
    {
      config: {
        rateLimit: {
          max: 5, // Strict limit: max 5 login attempts / minute (Brute-Force defense)
          timeWindow: "1 minute"
        }
      },
      schema: {
        tags: ["Authentication"],
        summary: "Authenticate user and issue session tokens",
        description:
          "Verifies user credentials. If an email is not found, a constant-time dummy Argon2 hash is performed to eliminate timing side-channel and account enumeration attacks.",
        body: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email", example: "alice@example.com" },
            password: { type: "string", example: "StrongP@ssw0rd!123" }
          }
        },
        response: {
          200: {
            description: "Login successful",
            type: "object",
            properties: {
              statusCode: { type: "number", example: 200 },
              message: { type: "string", example: "Login successful" },
              data: {
                type: "object",
                properties: {
                  user: {
                    type: "object",
                    additionalProperties: true
                  },
                  accessToken: { type: "string" }
                }
              }
            }
          },
          401: {
            description: "Invalid credentials (constant error message for non-existent and wrong passwords)",
            type: "object",
            properties: {
              statusCode: { type: "number", example: 401 },
              error: { type: "string", example: "Unauthorized" },
              message: { type: "string", example: "Invalid email or password" }
            }
          },
          429: {
            description: "Rate limit exceeded (5 attempts per minute)",
            type: "object",
            properties: {
              statusCode: { type: "number", example: 429 },
              error: { type: "string", example: "Too Many Requests" },
              message: { type: "string" },
              retryAfter: { type: "number", example: 60 }
            }
          }
        }
      }
    },
    loginHandler
  );

  // 3. POST /refresh
  fastify.post(
    "/refresh",
    {
      config: {
        rateLimit: {
          max: 20,
          timeWindow: "1 minute"
        }
      },
      schema: {
        tags: ["Authentication"],
        summary: "Rotate single-use refresh token (RTR)",
        description:
          "Rotates the single-use refresh token. If a previously consumed refresh token is presented again (theft/replay), the entire token family is immediately revoked and a 401 security alert is returned.",
        security: [{ cookieAuth: [] }],
        body: {
          type: "object",
          nullable: true,
          properties: {
            refreshToken: {
              type: "string",
              description: "Optional body fallback for mobile/desktop clients that do not use cookies"
            }
          }
        },
        response: {
          200: {
            description: "Tokens successfully rotated",
            type: "object",
            properties: {
              statusCode: { type: "number", example: 200 },
              message: { type: "string", example: "Token refreshed successfully" },
              data: {
                type: "object",
                properties: {
                  accessToken: { type: "string" }
                }
              }
            }
          },
          401: {
            description: "Invalid session, expired token, or token reuse detected",
            type: "object",
            properties: {
              statusCode: { type: "number", example: 401 },
              error: { type: "string", example: "Unauthorized" },
              message: { type: "string" }
            }
          }
        }
      }
    },
    refreshHandler
  );

  // 4. POST /logout
  fastify.post(
    "/logout",
    {
      schema: {
        tags: ["Authentication"],
        summary: "Log out current session",
        description: "Revokes the active refresh token session family and clears the HttpOnly cookie.",
        security: [{ cookieAuth: [] }],
        response: {
          200: {
            description: "Logged out successfully",
            type: "object",
            properties: {
              statusCode: { type: "number", example: 200 },
              message: { type: "string", example: "Logged out successfully" }
            }
          }
        }
      }
    },
    logoutHandler
  );

  // 5. GET /me (Protected)
  fastify.get(
    "/me",
    {
      preHandler: [authenticate],
      schema: {
        tags: ["User"],
        summary: "Get authenticated user profile",
        description:
          "Protected endpoint requiring a valid Bearer Access Token in the Authorization header. Verifies user tokenVersion against the database.",
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: "Current user profile data",
            type: "object",
            properties: {
              statusCode: { type: "number", example: 200 },
              data: {
                type: "object",
                properties: {
                  user: {
                    type: "object",
                    additionalProperties: true
                  }
                }
              }
            }
          },
          401: {
            description: "Missing, expired, or revoked access token",
            type: "object",
            properties: {
              statusCode: { type: "number", example: 401 },
              error: { type: "string", example: "Unauthorized" },
              message: { type: "string" }
            }
          }
        }
      }
    },
    meHandler
  );

  // 6. POST /logout-all (Protected)
  fastify.post(
    "/logout-all",
    {
      preHandler: [authenticate],
      schema: {
        tags: ["User"],
        summary: "Terminate all sessions on all devices",
        description:
          "Increments the user tokenVersion counter and revokes all refresh token records in PostgreSQL, immediately terminating all active sessions across all devices.",
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: "All active sessions revoked",
            type: "object",
            properties: {
              statusCode: { type: "number", example: 200 },
              message: { type: "string", example: "All sessions have been terminated successfully" }
            }
          },
          401: {
            description: "Unauthorized",
            type: "object",
            properties: {
              statusCode: { type: "number", example: 401 },
              error: { type: "string", example: "Unauthorized" },
              message: { type: "string" }
            }
          }
        }
      }
    },
    logoutAllHandler
  );
};
