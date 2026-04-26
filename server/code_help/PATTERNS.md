# Server Coding Patterns

## Repository Pattern
Every service uses repositories, never Mongoose models directly.

```js
// Default instance at module level
const defaultUserRepo = new UserRepository(User);

// Functions accept optional injection for testing
const getProfile = async (userId, { userRepository } = {}) => {
  const repo = userRepository || defaultUserRepo;
  return repo.findById(userId, '-password');
};
```

## Error Handling
- Throw `AppError(message, statusCode)` for expected errors
- Global error handler catches everything
- Mongoose ValidationError → 400
- Mongoose duplicate key (11000) → 409
- Mongoose CastError → 400
- AppError → err.statusCode
- Unknown → 500
- Response format: `{ error: "message" }` (+ `stack` in dev mode)

## Firebase Auth Pattern
Firebase Admin SDK is lazy-required inside `authService.firebaseAuth()` to allow Jest mocking:

```js
// In authService.js — lazy require so jest.mock() can intercept it
const admin = require('../config/firebase');
const decoded = await admin.auth().verifyIdToken(firebaseIdToken);
```

In tests, mock it before requiring authService:
```js
const mockVerifyIdToken = jest.fn();
jest.mock('../../src/config/firebase', () => ({
  auth: () => ({ verifyIdToken: mockVerifyIdToken }),
}));
const { firebaseAuth } = require('../../src/services/authService');
```

## CORS Pattern (Express 5)
Express 5 uses path-to-regexp v8 which does not support bare `*` wildcards.
Always use `/{*path}` for catch-all OPTIONS handler:

```js
const corsOptions = { origin: config.CORS_ORIGIN, credentials: true, ... };
app.use(cors(corsOptions));
app.options('/{*path}', cors(corsOptions)); // handles preflight for all routes
```

## Points System
Always use `updatePoints(userId, 'ACTION_NAME')` — never manually update points.
Action names are keys in POINTS object from constants.js.
Atomic $inc + floor-of-zero enforcement.

## Constants
Import from `../config/constants` — never hardcode values.
```js
const { POINTS, MAX_BIO_LENGTH, ALLOWED_SUBJECTS } = require('../config/constants');
```

## Streak
- Runs in auth middleware, cached per-day per-user
- Same day = skip. Previous day = increment + 1 point. Gap = reset to 1.

## Testing
- Pass mock repositories to service functions via options param
- No need for mongodb-memory-server in unit tests
- Property tests use fast-check with 100+ iterations
- Firebase Admin SDK is mocked via jest.mock() before requiring authService
