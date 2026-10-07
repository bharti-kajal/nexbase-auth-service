# NexBase Auth Service

A production-oriented authentication and authorization service built with Node.js and TypeScript.

NexBase is being developed as a hands-on backend engineering project to understand and implement secure authentication, authorization, session management, API security, and scalable backend architecture.

## Project Goals

The main goals of this project are:

- Build a secure authentication system from scratch
- Understand authentication and authorization deeply
- Apply backend system design principles
- Implement production-oriented security practices
- Learn and apply Fastify with TypeScript
- Work with PostgreSQL and Redis
- Design the system for future scalability
- Practice writing clean, maintainable backend code

## Tech Stack

### Backend
- Node.js
- TypeScript
- Fastify

### Database
- PostgreSQL
- Redis

### Authentication & Security
- Password hashing
- Access tokens
- Refresh tokens
- Token rotation
- Session management
- OTP verification
- Email verification
- Rate limiting
- Role-based access control

### API & Development
- REST API
- OpenAPI / Swagger
- Request validation
- Centralized error handling
- Structured logging

### DevOps
- Docker
- Docker Compose
- GitHub Actions
- AWS

> Some technologies listed above will be introduced progressively as the project evolves.

## High-Level Architecture

                    Client
                      │
                      ▼
                API / Gateway
                      │
                      ▼
              NexBase Auth Service
                      │
          ┌───────────┼───────────┐
          │           │           │
          ▼           ▼           ▼
     PostgreSQL     Redis      Email/OTP
          │           │
          ▼           ▼
        Users      Sessions
        Roles       Tokens

        