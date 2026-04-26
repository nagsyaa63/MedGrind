# MedGrind Coding Conventions

## Error Handling

- All API errors return `{ error: "message" }` — consistent across every endpoint.
- Frontend reads errors from `err.response?.data?.error`.
- Custom errors use `AppError` class (extends Error with `statusCode`).
- Global error handler catches everything; includes stack trace in development mode.

## Constants

- All magic numbers live in constants files — never hardcode values in services/components.
- Backend: `server/src/config/constants.js`
- Frontend: `client/src/config/constants.js`
- Import what you need: `const { POINTS, MAX_BIO_LENGTH } = require('../config/constants');`

## Repository Pattern

- Repositories accept their Mongoose Model via constructor: `new UserRepository(UserModel)`
- Services use default repository instances at module level.
- For testing, pass mock repositories via optional `{ repositories }` param:
  ```js
  const result = await createQuestion(data, userId, {
    questionRepository: mockQuestionRepo,
    userRepository: mockUserRepo,
  });
  ```

## Service Layer

- Services contain all business logic — validation, authorization, orchestration.
- Controllers are thin: parse request → call service → format response. No logic.
- No business logic in routes or controllers.
- Routes only define HTTP method + path + middleware chain.

## Points System

- Points updated atomically via `$inc` + floor-of-zero enforcement (never goes negative).
- Points Engine maps action strings to deltas from constants.
- Always use `updatePoints(userId, 'ACTION_NAME')` — never manually update points.

## Streaks

- Streak logic runs once per user per calendar day (cached via `lastActiveDate`).
- Same day = no-op. Previous day = increment. Older/null = reset to 1.

## Frontend Patterns

- AuthContext wraps the entire app — all components can access auth state.
- apiClient auto-attaches JWT to every request; 401 response triggers logout.
- ProtectedRoute guards all authenticated pages.
- Loading states use the shared `LoadingSpinner` component.
- Tailwind CSS for all styling — no CSS modules or styled-components.

## Naming

- Backend files: camelCase (`questionService.js`, `userRepository.js`)
- Frontend pages: PascalCase with `Page` suffix (`QuestionFeedPage.jsx`)
- Frontend components: PascalCase (`Navbar.jsx`, `ProtectedRoute.jsx`)
- API routes: kebab-case paths (`/api/questions/challenged`)
