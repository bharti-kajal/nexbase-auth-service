import fastify, { type FastifyInstance } from "fastify";
import fastifyCookie from "@fastify/cookie";
import fastifyHelmet from "@fastify/helmet";
import fastifyCors from "@fastify/cors";
import fastifyRateLimit from "@fastify/rate-limit";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import { env } from "./config/env.ts";
import { authRoutes } from "./modules/auth/auth.routes.ts";

export async function buildApp(): Promise<FastifyInstance> {
  const app = fastify({
    ajv: {
      customOptions: {
        strict: false // Allows OpenAPI keywords like 'example' in schemas
      }
    },
    logger: {
      level: env.NODE_ENV === "development" ? "info" : "warn"
    }
  });

  // 1. Security Headers (Helmet: CSP, HSTS, X-Content-Type-Options, Frameguard)
  // Configured to permit Swagger UI inline styling and scripts
  await app.register(fastifyHelmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "validator.swagger.io"],
        connectSrc: ["'self'"]
      }
    },
    crossOriginEmbedderPolicy: false
  });

  // 2. Strict CORS Configuration (origin whitelisting & credentials for cookies)
  const allowedOrigins = env.CORS_ORIGIN.split(",").map((o) => o.trim());
  await app.register(fastifyCors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) {
        return cb(null, true);
      }
      return cb(new Error("CORS: Not allowed by policy"), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
  });

  // 3. Distributed / In-memory Rate Limiting (Brute-force & DoS defense)
  await app.register(fastifyRateLimit, {
    global: true,
    max: 100, // 100 requests per minute default
    timeWindow: "1 minute",
    errorResponseBuilder: (request, context) => ({
      statusCode: 429,
      error: "Too Many Requests",
      message: `Rate limit exceeded. Try again in ${Math.ceil(context.ttl / 1000)} seconds.`,
      retryAfter: Math.ceil(context.ttl / 1000)
    })
  });

  // 4. Secure Cookie Parser
  await app.register(fastifyCookie);

  // 5. OpenAPI / Swagger Documentation Generator
  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: "NexBase Auth Service API",
        description:
          "Production-ready authentication and authorization API built with Node.js, Fastify, TypeScript, Argon2id, and Prisma PostgreSQL.\n\n" +
          "### Security Features:\n" +
          "- **Argon2id** password hashing with constant-time dummy verification\n" +
          "- **Single-Use Refresh Token Rotation (RTR)** with session family theft detection\n" +
          "- **HttpOnly, SameSite=Strict** cookies to prevent XSS and CSRF token theft\n" +
          "- **Global & route-level rate limiting** to prevent brute-force and credential stuffing\n" +
          "- **Instant session revocation** via `tokenVersion` counter",
        version: "1.0.0"
      },
      servers: [
        {
          url: `http://${env.HOST}:${env.PORT}`,
          description: "Local development server"
        }
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description: "Provide your short-lived access token (obtained from login/register)"
          },
          cookieAuth: {
            type: "apiKey",
            in: "cookie",
            name: "refreshToken",
            description: "HttpOnly cookie containing the rotating refresh token"
          }
        }
      },
      tags: [
        { name: "Health", description: "Health check and uptime monitoring" },
        { name: "Authentication", description: "Public registration, login, and session refresh" },
        { name: "User", description: "Protected user profile and session management" }
      ]
    }
  });

  // 6. Swagger UI interactive web interface at /docs
  await app.register(fastifySwaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: true
    },
    staticCSP: false
  });

  // Health check endpoint
  app.get(
    "/health",
    {
      schema: {
        tags: ["Health"],
        summary: "Check service health",
        description: "Returns the current operating status and timestamp of the service.",
        response: {
          200: {
            type: "object",
            properties: {
              status: { type: "string" },
              timestamp: { type: "string", format: "date-time" }
            }
          }
        }
      }
    },
    async () => {
      return { status: "ok", timestamp: new Date().toISOString() };
    }
  );

  app.get(
    "/",
    {
      schema: {
        hide: true // Hidden from Swagger docs
      }
    },
    async () => {
      return { message: "Welcome to NexBase Auth Service API. View interactive docs at /docs" };
    }
  );

  // Modular auth routes
  await app.register(authRoutes, { prefix: "/api/auth" });

  return app;
}
