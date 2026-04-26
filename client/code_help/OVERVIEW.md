# MedGrind Client — Complete Context

## What This Is
React 18 SPA for the MedGrind medical MCQ platform. Communicates with a Node.js/Express backend via REST API.

## Tech Stack
- React 18 + Vite (build tool)
- Tailwind CSS v3 (utility-first styling)
- React Router DOM v7 (client-side routing)
- Axios (HTTP client)
- Firebase Client SDK v12 (Google OAuth)

## Architecture
```
BrowserRouter
  └─ AuthProvider (React Context)
       └─ Routes
            ├─ Public: / (Login with Google)
            ├─ Semi-public: /onboarding (authenticated but not onboarded)
            └─ Protected (ProtectedRoute wrapper — auth + onboarding gate)
                 ├─ /questions (Feed)
                 ├─ /questions/new (Create)
                 ├─ /questions/challenged (Challenged)
                 ├─ /questions/:id (Detail)
                 ├─ /profile/:userId (Profile)
                 ├─ /profile/edit (Edit Profile)
                 └─ /leaderboard (Leaderboard)
```

## How Backend Connects
- Backend is a separate Express server (default http://localhost:5000)
- Base URL configured via `VITE_API_URL` env var
- All API calls go through `src/api/apiClient.js` (Axios instance)
- Request interceptor auto-attaches JWT from localStorage
- Response interceptor catches 401 → removes token → redirects to login
- Error responses from backend are always `{ error: "message" }`
- Frontend reads errors as `err.response?.data?.error`

## Auth Flow (Google Firebase)
1. User clicks "Sign in with Google" on LoginPage
2. `signInWithGoogle()` in AuthContext calls `signInWithPopup(auth, googleProvider)`
3. Firebase returns a credential with an ID token
4. Client POSTs `{ firebaseIdToken }` to `/api/auth/firebase`
5. Server returns `{ user, token }` (JWT)
6. Token stored in localStorage; user set in context
7. `signInWithGoogle` returns the user object so LoginPage can read `isOnboarded` immediately
8. Navigate to `/onboarding` (new user) or `/questions` (returning user)
9. On app load: checks localStorage for token, calls GET /api/auth/me to validate
10. On 401 from any endpoint: auto-logout (clear token, redirect to /)

## Onboarding Flow
- New Google users have `isOnboarded: false`
- `ProtectedRoute` redirects them to `/onboarding`
- `OnboardingPage` collects `collegeName` + `currentYear`
- Calls `updateProfile()` → server sets `isOnboarded: true`
- Navigate to `/questions`

## Key Files
- `src/App.jsx` — Router setup with all routes
- `src/main.jsx` — Entry point, renders App
- `src/api/apiClient.js` — Axios instance with JWT interceptors
- `src/config/firebase.js` — Firebase Client SDK init (auth, googleProvider)
- `src/context/AuthContext.jsx` — Auth state (user, token, isAuthenticated, isOnboarded, signInWithGoogle, logout, updateProfile)
- `src/config/constants.js` — Frontend constants (subjects, difficulties, colors, pagination)
- `src/components/Navbar.jsx` — Responsive nav with hamburger menu
- `src/components/ProtectedRoute.jsx` — Auth + onboarding guard (redirects to / or /onboarding)
- `src/components/LoadingSpinner.jsx` — Reusable spinner

## What Backend Provides
- POST /api/auth/firebase → `{ user, token }` (upserts user, returns isOnboarded flag)
- GET /api/auth/me → user object (validates token)
- GET /api/questions → `{ questions, total, page, limit }` (unanswered-first sorting)
- GET /api/questions/:id → full question with author, challenges, vote arrays
- GET /api/questions/challenged → array of questions with high challenge counts
- POST /api/questions/:id/answer → `{ answer, isCorrect, correctOptions, explanation }`
- POST /api/questions/:id/like|downvote|approve → updated question object
- POST /api/questions/:id/challenge → new challenge object
- POST /api/questions/:id/challenge/:id/vote → `{ challenge, resolved }`
- GET /api/users/:id → user profile (no password)
- GET /api/users/leaderboard → array of user objects
- PUT /api/users/profile → updated user (sets isOnboarded: true when profile is complete)

## Route Order Matters
`/questions/challenged` MUST be defined before `/questions/:id` in the router, otherwise React Router treats "challenged" as an :id param.

## Styling
- Tailwind CSS v3 with PostCSS
- No CSS modules or styled-components
- Responsive breakpoints: `md:` for desktop nav, mobile-first approach
- Color scheme: indigo-600 primary, gray tones for text/borders, amber for challenges, green/red for correct/incorrect
