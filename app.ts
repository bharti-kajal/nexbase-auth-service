import { buildApp } from "./src/app.ts";
import { env } from "./src/config/env.ts";

const start = async () => {
  try {
    const app = await buildApp();
    await app.listen({ port: env.PORT, host: env.HOST });
    console.log(`🚀 NexBase Auth Service running on http://${env.HOST}:${env.PORT}`);
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
};

start();
