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
- CORS: Configured via CORS_ORIGIN env var. Uses explicit `app.options('/{*path}', cors(...))` for Express 5 preflight compatibility.
- Error format: ALL endpoints return `{ error: "message" }` — frontend reads `err.response?.data?.error`
- The frontend NEVER calls Mongoose or touches the DB directly

## Auth Flow (Google Firebase)
1. Client calls `signInWithPopup(googleProvider)` via Firebase Client SDK
2. Firebase returns an ID token
3. Client POSTs `{ firebaseIdToken }` to `/api/auth/firebase`
4. Server verifies token via Firebase Admin SDK (`admin.auth().verifyIdToken()`)
5. Server performs 3-step upsert: find by UID → legacy email migration → create new user
6. Server returns `{ user, token }` (JWT, 1-day expiry)
7. Client stores JWT in localStorage
8. Every subsequent request includes `Authorization: Bearer <token>`
9. Auth middleware verifies JWT, attaches `req.user = { id, email }` to request
10. Streak tracking runs once per user per day (cached in-memory)

## Onboarding Flow
- New Google users have `isOnboarded: false`
- Client's `ProtectedRoute` redirects them to `/onboarding`
- User submits `collegeName` + `currentYear` via `PUT /api/users/profile`
- `userService.updateProfile` sets `isOnboarded: true` when both fields are valid
- User is then redirected to `/questions`

## Key Files
- `src/app.js` — Express setup, CORS (with preflight), body parser, route mounting, error handler
- `src/config/index.js` — Env vars (PORT, MONGODB_URI, JWT_SECRET, CORS_ORIGIN, NODE_ENV, FIREBASE_*)
- `src/config/constants.js` — ALL magic numbers (points, thresholds, limits, enums, Firebase error messages)
- `src/config/firebase.js` — Firebase Admin SDK singleton
- `src/middleware/auth.js` — JWT verification + streak tracking
- `src/middleware/errorHandler.js` — Global error handler → `{ error: "message" }`
- `src/middleware/rateLimiter.js` — 20 req/15min on auth routes

## Database
- MongoDB via Mongoose ODM
- 3 collections: users, questions, answers
- Questions have embedded challenge subdocuments
- Answer has compound unique index on (user, question) — one answer per user per question
- Points updated atomically via $inc + floor-of-zero
- User email index declared inline (unique: true in schema field) — NOT duplicated via schema.index()
- User firebaseUid index is sparse unique (allows null for users not yet linked)

## What Frontend Expects From This Server
- Consistent `{ error: "message" }` on all errors
- JWT token in firebase auth response as `{ user: {...}, token: "..." }`
- `user.isOnboarded` boolean in every user response
- Question feed returns `{ questions: [...], total: N, page: N, limit: N }`
- Question detail returns full question with populated author and challenges
- Voting endpoints return the updated question document
- Challenge vote returns `{ challenge: {...}, resolved: boolean }`
- Leaderboard returns array of user objects
- Profile returns user object (never includes password)
