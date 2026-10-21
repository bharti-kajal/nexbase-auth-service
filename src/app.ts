import fastify, { type FastifyInstance } from "fastify";
import fastifyCookie from "@fastify/cookie";
import { env } from "./config/env.ts";
import { authRoutes } from "./modules/auth/auth.routes.ts";

export async function buildApp(): Promise<FastifyInstance> {
  const app = fastify({
    logger: {
      level: env.NODE_ENV === "development" ? "info" : "warn"
    }
  });

  // Secure cookie parser
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

