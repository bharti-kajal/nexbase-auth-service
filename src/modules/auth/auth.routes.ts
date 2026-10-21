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
  // Public routes with strict brute-force rate limits
  fastify.post(
    "/register",
    {
      config: {
        rateLimit: {
          max: 10, // Max 10 registration attempts per minute per IP
          timeWindow: "1 minute"
        }
      }
    },
    registerHandler
  );

  fastify.post(
    "/login",
    {
      config: {
        rateLimit: {
          max: 5, // Max 5 login attempts per minute per IP (Brute-Force defense)
          timeWindow: "1 minute"
        }
      }
    },
    loginHandler
  );

  fastify.post(
    "/refresh",
    {
      config: {
        rateLimit: {
          max: 20, // Max 20 token refreshes per minute
          timeWindow: "1 minute"
        }
      }
    },
    refreshHandler
  );

  fastify.post("/logout", logoutHandler);

  // Protected routes (require valid Bearer Access Token)
  fastify.get("/me", { preHandler: [authenticate] }, meHandler);
  fastify.post("/logout-all", { preHandler: [authenticate] }, logoutAllHandler);
};
