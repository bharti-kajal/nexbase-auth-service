# NexBase Auth Service

> A production-oriented authentication and authorization service built with Node.js, TypeScript, and Fastify.

NexBase Auth Service is a personal backend engineering project focused on designing and implementing a secure, modular, and scalable authentication system.

The project is intentionally being built incrementally—from core authentication flows to session management, authorization, security hardening, testing, observability, and deployment—to develop practical backend engineering and system-design skills.

---

## Overview

Authentication is a foundational component of almost every modern application. NexBase is designed to explore the engineering decisions behind a robust authentication service rather than simply implementing login and registration endpoints.

The system is being designed around the following principles:

- Security by design
- Clear separation of responsibilities
- Strong API contracts and validation
- Stateless and stateful authentication where appropriate
- Secure session and token management
- Scalable backend architecture
- Testability and observability
- Production-oriented engineering practices

---

## Objectives

The primary objectives of NexBase are to:

- Design a complete authentication lifecycle
- Understand authentication vs. authorization
- Implement secure credential handling
- Design access-token and refresh-token flows
- Implement session and device management
- Introduce Redis for short-lived and high-frequency data
- Design role- and permission-based authorization
- Apply API security best practices
- Build a maintainable TypeScript backend
- Containerize and automate the application
- Understand how the service can evolve as traffic and requirements grow

---

## Technology Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Language | TypeScript |
| Framework | Fastify |
| Primary Database | PostgreSQL |
| Cache / Session Store | Redis |
| API Style | REST |
| API Documentation | OpenAPI / Swagger |
| Containerization | Docker |
| CI/CD | GitHub Actions |
| Cloud | AWS |
| Version Control | Git |

> Technologies will be introduced progressively as the corresponding features are implemented.

---

## Architecture

The initial architecture is intentionally simple and will evolve as the system grows.

```text
                         ┌──────────────────┐
                         │      Client      │
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │    HTTP / API    │
                         │     Fastify      │
                         └────────┬─────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    │             │             │
                    ▼             ▼             ▼
              Authentication  Authorization  Sessions
                    │             │             │
                    └─────────────┼─────────────┘
                                  │
                 ┌────────────────┴────────────────┐
                 │                                 │
                 ▼                                 ▼
          ┌──────────────┐                  ┌──────────────┐
          │  PostgreSQL  │                  │    Redis     │
          │ Persistent   │                  │ Short-lived  │
          │ Data         │                  │ Data         │
          └──────────────┘                  └──────────────┘
```

As the project evolves, additional components such as email/OTP providers, background processing, observability, and external integrations may be introduced.

---

## Authentication Lifecycle

The intended authentication lifecycle is:

```text
                    Registration
                         │
                         ▼
                 Validate Request
                         │
                         ▼
                 Hash Password
                         │
                         ▼
                Create User Record
                         │
                         ▼
                Verify Account
                         │
                         ▼
                       Login
                         │
                         ▼
                Verify Credentials
                         │
                         ▼
             Issue Access + Refresh Token
                         │
                         ▼
                 Access Protected API
                         │
                         ▼
                  Refresh Session
                         │
                         ▼
               Rotate / Revoke Tokens
                         │
                         ▼
                      Logout
```

The exact implementation will evolve as security requirements are added.

---

## Core Domains

### Identity

Responsible for the user's identity and account lifecycle.

Planned capabilities:

- User registration
- Login
- Account verification
- Password management
- Account status management

### Authentication

Responsible for proving the user's identity.

Planned capabilities:

- Credential authentication
- Access tokens
- Refresh tokens
- Token rotation
- Logout
- Session revocation

### Authorization

Responsible for determining what an authenticated user is allowed to do.

Planned capabilities:

- Roles
- Permissions
- Role-based access control
- Permission-based authorization
- Protected resources

### Session Management

Responsible for managing authenticated sessions across devices.

Planned capabilities:

- Device/session tracking
- Session expiration
- Session revocation
- Multi-device sessions
- Refresh-token lifecycle

### Verification

Responsible for account and security verification.

Planned capabilities:

- Email verification
- OTP generation
- OTP verification
- OTP expiration
- Resend protection

---

## Security Considerations

Security is treated as a core architectural concern rather than a final step.

Planned controls include:

- Password hashing using a modern password-hashing algorithm
- Strong password validation
- Input validation
- Authentication rate limiting
- Brute-force protection
- OTP expiration
- OTP resend throttling
- Refresh-token rotation
- Session revocation
- Secure secret management
- Security headers
- Audit logging
- Consistent error handling
- Protection against credential enumeration
- Protection against replay and token misuse

Sensitive credentials and secrets must never be committed to source control.

---

## API Design

The service follows REST principles and aims to maintain clear API contracts.

Example resource areas:

```text
/auth
/users
/sessions
/roles
/permissions
```

Example authentication endpoints planned:

```text
POST   /auth/register
POST   /auth/login
POST   /auth/logout
POST   /auth/refresh
POST   /auth/verify-email
POST   /auth/forgot-password
POST   /auth/reset-password
POST   /auth/verify-otp
```

> Endpoints are considered part of the evolving design and may change as implementation decisions are made.

---

## Data Storage Strategy

### PostgreSQL

PostgreSQL will be the primary persistent data store for:

- Users
- Roles
- Permissions
- Account states
- Persistent authentication metadata
- Audit information where appropriate

### Redis

Redis will be introduced for workloads that benefit from low-latency, short-lived storage, such as:

- OTPs
- Rate-limit counters
- Temporary authentication state
- Session-related data where appropriate
- Token-related metadata
- Caching

The project will explicitly evaluate what belongs in PostgreSQL versus Redis rather than using Redis as a replacement for the primary database.

---

## Project Structure

The structure will evolve with the system, but the intended organization is module-oriented:

```text
nexbase-auth-service/
│
├── src/
│   ├── config/
│   ├── plugins/
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── sessions/
│   │   ├── roles/
│   │   └── permissions/
│   │
│   ├── common/
│   ├── app.ts
│   └── server.ts
│
├── tests/
│
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

The final structure will be driven by actual domain boundaries rather than forcing premature abstraction.

---

## Development Roadmap

### Phase 1 — Foundation

- [x] Repository setup
- [ ] Node.js project setup
- [ ] TypeScript configuration
- [ ] Fastify application setup
- [ ] Environment configuration
- [ ] Basic project structure

### Phase 2 — User Authentication

- [ ] User registration
- [ ] Password hashing
- [ ] Login
- [ ] Credential validation
- [ ] Protected route
- [ ] Authentication middleware/hooks

### Phase 3 — Token & Session Management

- [ ] Access-token strategy
- [ ] Refresh-token strategy
- [ ] Token expiration
- [ ] Refresh-token rotation
- [ ] Logout
- [ ] Session revocation
- [ ] Multi-device sessions

### Phase 4 — Verification & Recovery

- [ ] Email verification
- [ ] OTP generation
- [ ] OTP verification
- [ ] OTP expiration
- [ ] OTP resend protection
- [ ] Forgot password
- [ ] Password reset

### Phase 5 — Authorization

- [ ] Roles
- [ ] Permissions
- [ ] RBAC
- [ ] Permission checks
- [ ] Protected resources

### Phase 6 — Security Hardening

- [ ] Rate limiting
- [ ] Brute-force protection
- [ ] Security headers
- [ ] Credential enumeration protection
- [ ] Secure error responses
- [ ] Audit logging

### Phase 7 — Data & Infrastructure

- [ ] PostgreSQL integration
- [ ] Redis integration
- [ ] Database migrations
- [ ] Docker
- [ ] Docker Compose
- [ ] Health checks

### Phase 8 — Quality & Operations

- [ ] Unit tests
- [ ] Integration tests
- [ ] API documentation
- [ ] Structured logging
- [ ] Monitoring
- [ ] CI/CD
- [ ] AWS deployment

### Phase 9 — Scalability

- [ ] Horizontal scaling analysis
- [ ] Load balancing
- [ ] Stateless application design
- [ ] Redis scaling considerations
- [ ] Database indexing and optimization
- [ ] Failure scenarios
- [ ] Availability and resilience analysis

---

## Local Development

### Prerequisites

Install:

- Node.js
- npm
- PostgreSQL
- Redis
- Git
- Docker (recommended)

### Clone

```bash
git clone git@github.com:bharti-kajal/nexbase-auth-service.git
cd nexbase-auth-service
```

### Install Dependencies

```bash
npm install
```

### Environment

Create a local `.env` file from `.env.example`.

Example:

```env
NODE_ENV=development
PORT=3000

DATABASE_URL=

REDIS_URL=

JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
```

Never commit `.env` or real secrets to the repository.

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Production

```bash
npm start
```

---

## Testing Strategy

Testing will be introduced alongside each major feature.

The intended testing layers are:

```text
Unit Tests
    ↓
Service / Domain Tests
    ↓
Integration Tests
    ↓
API / End-to-End Tests
```

Authentication-specific scenarios will include:

- Valid registration
- Duplicate registration
- Invalid credentials
- Expired tokens
- Invalid refresh tokens
- Revoked sessions
- OTP expiration
- OTP resend limits
- Rate-limit behavior
- Unauthorized access
- Forbidden access

---

## Engineering Principles

NexBase follows these principles during development:

1. **Security first** — authentication code handles sensitive data and must be designed defensively.
2. **Explicit contracts** — validate inputs and define predictable API behavior.
3. **Separation of concerns** — routes, application logic, infrastructure, and persistence should have clear responsibilities.
4. **Simple before scalable** — start with a maintainable architecture and introduce complexity when requirements justify it.
5. **Fail safely** — errors should not expose sensitive implementation details.
6. **Observable systems** — important authentication events should be diagnosable.
7. **Test important behavior** — security-critical flows should have automated coverage.
8. **Design for evolution** — the architecture should support future scaling without premature microservices.

---

## System Design Topics Covered

This project is also used to explore backend system-design concepts including:

- Authentication architecture
- Authorization
- Token lifecycle
- Session management
- Caching
- Rate limiting
- Database indexing
- API security
- Horizontal scaling
- Load balancing
- Stateless services
- Distributed systems
- Fault tolerance
- Observability
- CI/CD
- Infrastructure and deployment

---

## Project Status

**Status:** 🚧 Active Development

NexBase is being implemented incrementally. Features listed as planned are intentionally not considered complete until they are designed, implemented, tested, and documented.

---

## Author

**Kajal Bharti**

Backend Engineer | Node.js | TypeScript | DevOps

Personal project focused on backend engineering, authentication architecture, security, and system design.

---

## License

This project is intended for personal learning, portfolio development, and interview preparation.
