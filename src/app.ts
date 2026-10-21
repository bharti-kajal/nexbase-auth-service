import fastify, { type FastifyInstance } from "fastify";
import fastifyCookie from "@fastify/cookie";
import fastifyHelmet from "@fastify/helmet";
import fastifyCors from "@fastify/cors";
import fastifyRateLimit from "@fastify/rate-limit";
import { env } from "./config/env.ts";
import { authRoutes } from "./modules/auth/auth.routes.ts";

export async function buildApp(): Promise<FastifyInstance> {
  const app = fastify({
    logger: {
      level: env.NODE_ENV === "development" ? "info" : "warn"
    }
  });

  // 1. Security Headers (Helmet: CSP, HSTS, X-Content-Type-Options, Frameguard)
  await app.register(fastifyHelmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
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

  // Health check endpoint
  app.get("/health", async () => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });

  app.get("/", async () => {
    return { message: "Welcome to NexBase Auth Service API" };
  });

  // Modular auth routes
  await app.register(authRoutes, { prefix: "/api/auth" });

  return app;
}
