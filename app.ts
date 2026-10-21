import fastify from "fastify";
import { env } from "./src/config/env.ts";
import { authRoutes } from "./src/modules/auth/auth.routes.ts";

const app = fastify({
  logger: {
    level: env.NODE_ENV === "development" ? "info" : "warn"
  }
});

// Health check endpoint
app.get("/health", async () => {
  return { status: "ok", timestamp: new Date().toISOString() };
});

app.get("/", async () => {
  return { message: "Welcome to NexBase Auth Service API" };
});

// Register modular routes
app.register(authRoutes, { prefix: "/api/auth" });

// Start server
const start = async () => {
  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    console.log(`🚀 NexBase Auth Service running on http://${env.HOST}:${env.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
