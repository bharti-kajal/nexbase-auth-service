import "@fastify/jwt";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      userId: string;
      email: string;
      role: "user" | "admin";
      tokenVersion: number;
    };
    user: {
      userId: string;
      email: string;
      role: "user" | "admin";
      tokenVersion: number;
    };
  }
}

