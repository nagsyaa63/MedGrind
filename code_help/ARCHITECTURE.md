# MedGrind Architecture

## Monorepo Structure

```
server/   → Node.js + Express REST API
client/   → React 18 + Vite SPA
```

Deployed separately: frontend on Vercel, backend on Render.com, database on MongoDB Atlas free tier.

## Backend Layers

```
Routes → Controllers → Services → Repositories → Models (Mongoose)
                                       ↓
                                  Points Engine
                                  (uses UserRepository)
```

- **Routes**: URL mapping + middleware binding (auth, rate limiting). No logic.
- **Controllers**: Parse request, call service, format response. No business logic.
- **Services**: All business logic, validation, authorization. Accept optional `{ repositories }` param for test injection.
- **Repositories**: Data access layer. Each wraps a Mongoose model via constructor injection. Services never touch Mongoose directly.
- **Models**: Mongoose schemas + indexes. No business logic beyond schema validation.
- **Points Engine**: `updatePoints(userId, action)` — atomic `$inc` with floor-of-zero enforcement via UserRepository.

## Frontend Architecture

```
React Router v7 (BrowserRouter)
  └─ AuthContext (user, token, isAuthenticated, isOnboarded)
       └─ ProtectedRoute wrapper (auth + onboarding gate)
            └─ Page components
                 └─ apiClient (Axios + JWT interceptor)
```

- **AuthContext**: Provides auth state + `signInWithGoogle` / `logout` / `updateProfile` functions to all components.
- **apiClient**: Axios instance with request interceptor (attaches Bearer token) and response interceptor (401 → logout).
- **ProtectedRoute**: Redirects to `/` if not authenticated; redirects to `/onboarding` if authenticated but not onboarded.

## Authentication Architecture

```
Client (Firebase SDK)
  └─ signInWithPopup(googleProvider)
       └─ Firebase returns ID token
            └─ POST /api/auth/firebase { firebaseIdToken }
                 └─ Server verifies token via Firebase Admin SDK
                      └─ 3-step upsert:
                           1. findByFirebaseUid → existing user
                           2. findByEmailAndSetFirebaseUid → legacy migration
                           3. create → brand-new user
                      └─ Returns { user, JWT }
```

## Key Design Decisions

- **Google-only auth via Firebase** — no email/password. Firebase handles OAuth, server verifies ID tokens via Admin SDK.
- **Onboarding gate** — new Google users have `isOnboarded: false`. ProtectedRoute redirects them to `/onboarding` until they complete their profile (collegeName + currentYear).
- **Legacy migration** — existing email-based users are linked to their Google account on first sign-in via atomic `findOneAndUpdate`.
- JWT stored in localStorage (simpler for cross-domain SPA; XSS mitigated by CSP)
- Atomic `$inc` for points (no read-modify-write races)
- Compound unique index on Answer(user, question) — one answer per user per question at DB level
- Embedded challenge subdocuments (always accessed with parent question, low volume per question)
- Repository pattern with constructor injection for testability (mock model in tests)
- Constants centralized in `server/src/config/constants.js` and `client/src/config/constants.js`
- Streak tracking cached per-day (runs once per user per calendar day)
- Pagination via skip/limit (acceptable for Atlas free tier dataset size)
- CORS configured with explicit `OPTIONS` preflight handler for Express 5 compatibility
