# MedGrind Server — Complete Context

## What This Is
Node.js/Express REST API for the MedGrind medical MCQ platform. Serves a React SPA frontend at a separate origin.

## Architecture
```
Routes → Controllers → Services → Repositories → Models (Mongoose → MongoDB)
                                       ↓
                                  Points Engine (uses UserRepository)
```

- Routes: Define HTTP paths + attach middleware. No logic.
- Controllers: Parse req → call service → format res. No business logic.
- Services: ALL business logic lives here. Validation, auth checks, orchestration.
- Repositories: Data access layer. Wraps Mongoose models. Constructor injection for testability.
- Models: Mongoose schemas + indexes. Schema-level validation only.

## How Frontend Connects
- Frontend is a React SPA at a different origin (default http://localhost:5173)
- All communication via REST JSON API at /api/*
- Auth: Frontend sends `Authorization: Bearer <JWT>` header on every request
- CORS: Configured via CORS_ORIGIN env var to allow frontend origin
- Error format: ALL endpoints return `{ error: "message" }` — frontend reads `err.response?.data?.error`
- The frontend NEVER calls Mongoose or touches the DB directly

## Auth Flow
1. Frontend POSTs to /api/auth/register or /api/auth/login
2. Server validates, creates/finds user, returns `{ user, token }` (JWT)
3. Frontend stores token in localStorage
4. Every subsequent request includes `Authorization: Bearer <token>`
5. Auth middleware verifies JWT, attaches `req.user = { id, email }` to request
6. Streak tracking runs once per user per day (cached in-memory)

## Key Files
- `src/app.js` — Express setup, CORS, body parser, route mounting, error handler
- `src/config/index.js` — Env vars (PORT, MONGODB_URI, JWT_SECRET, CORS_ORIGIN, NODE_ENV)
- `src/config/constants.js` — ALL magic numbers (points, thresholds, limits, enums)
- `src/middleware/auth.js` — JWT verification + streak tracking
- `src/middleware/errorHandler.js` — Global error handler → `{ error: "message" }`
- `src/middleware/rateLimiter.js` — 20 req/15min on auth routes

## Database
- MongoDB via Mongoose ODM
- 3 collections: users, questions, answers
- Questions have embedded challenge subdocuments
- Answer has compound unique index on (user, question) — one answer per user per question
- Points updated atomically via $inc + floor-of-zero

## What Frontend Expects From This Server
- Consistent `{ error: "message" }` on all errors
- JWT token in login/register response as `{ user: {...}, token: "..." }`
- Question feed returns `{ questions: [...], total: N, page: N, limit: N }`
- Question detail returns full question with populated author and challenges
- Voting endpoints return the updated question document
- Challenge vote returns `{ challenge: {...}, resolved: boolean }`
- Leaderboard returns array of user objects
- Profile returns user object (never includes password)
