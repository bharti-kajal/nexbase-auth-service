import type { FastifyPluginAsync } from "fastify";
import { registerHandler, loginHandler } from "./auth.controller.ts";

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post("/register", registerHandler);
  fastify.post("/login", loginHandler);
};

