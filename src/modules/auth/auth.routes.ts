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
  // Public routes
  fastify.post("/register", registerHandler);
  fastify.post("/login", loginHandler);
  fastify.post("/refresh", refreshHandler);
  fastify.post("/logout", logoutHandler);

  // Protected routes (require valid Bearer Access Token)
  fastify.get("/me", { preHandler: [authenticate] }, meHandler);
  fastify.post("/logout-all", { preHandler: [authenticate] }, logoutAllHandler);
};
