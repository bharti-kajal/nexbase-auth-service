import type { FastifyRequest, FastifyReply } from "fastify";
import { registerSchema, loginSchema } from "./auth.schema.ts";
import { authService } from "./auth.services.ts";

export async function registerHandler(request: FastifyRequest, reply: FastifyReply) {
  const result = registerSchema.safeParse(request.body);
  if (!result.success) {
    return reply.status(400).send({
      statusCode: 400,
      error: "Bad Request",
      message: "Validation failed",
      details: result.error.issues.map(err => ({
        field: err.path.join("."),
        message: err.message
      }))
    });
  }

  try {
    const user = await authService.register(result.data);
    return reply.status(201).send({
      statusCode: 201,
      message: "User registered successfully",
      data: { user }
    });
  } catch (error: any) {
    if (error.message === "EMAIL_ALREADY_EXISTS") {
      return reply.status(409).send({
        statusCode: 409,
        error: "Conflict",
        message: "An account with this email already exists"
      });
    }

    request.log.error(error);
    return reply.status(500).send({
      statusCode: 500,
      error: "Internal Server Error",
      message: "An unexpected error occurred"
    });
  }
}

export async function loginHandler(request: FastifyRequest, reply: FastifyReply) {
  const result = loginSchema.safeParse(request.body);
  if (!result.success) {
    return reply.status(400).send({
      statusCode: 400,
      error: "Bad Request",
      message: "Invalid input",
      details: result.error.issues.map(err => ({
        field: err.path.join("."),
        message: err.message
      }))
    });
  }

  try {
    const user = await authService.login(result.data);
    return reply.status(200).send({
      statusCode: 200,
      message: "Login successful",
      data: { user }
    });
  } catch (error: any) {
    if (error.message === "INVALID_CREDENTIALS") {
      return reply.status(401).send({
        statusCode: 401,
        error: "Unauthorized",
        message: "Invalid email or password"
      });
    }

    request.log.error(error);
    return reply.status(500).send({
      statusCode: 500,
      error: "Internal Server Error",
      message: "An unexpected error occurred"
    });
  }
}

