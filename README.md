# Leaky Bucket Challenge

A Node.js API implementing a leaky bucket rate limiting strategy for PIX key queries, inspired by BACEN's rate limiting system.

The API features:
- Multi-tenant token bucket system where each user gets 10 tokens
- Token replenishment of 1 token per hour, up to max 10 tokens
- JWT authentication with bearer tokens
- Token consumption on each request - failed requests decrease token count
- Company and user management with token policies
- Built with Elysia.js, Prisma ORM and PostgreSQL

The system implements core rate limiting concepts from BACEN's PIX DICT API specification.
