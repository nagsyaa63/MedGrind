# Client Spec Summary

## Full Specs

- `.kiro/specs/medgrind-platform/` — Original platform spec (all pages, auth context, routing)
- `.kiro/specs/medgrind-refactor/` — Refactor spec (challenge UX redesign, constants extraction)

## Tech Stack

- React 18 + Vite (build tool)
- Tailwind CSS v3 (utility-first styling)
- React Router DOM v6 (client-side routing)
- Axios (HTTP client with JWT interceptor)

## State Management

- AuthContext provides `user`, `token`, `isAuthenticated`, `loading` + functions: `login()`, `register()`, `logout()`, `updateProfile()`
- JWT stored in localStorage, auto-attached to requests via Axios interceptor
- 401 responses trigger automatic logout

## Constants

All configurable values in `src/config/constants.js` — subjects, difficulty levels, option keys, difficulty colors, pagination defaults.

## Pages

| Route | Component | Protected |
|-------|-----------|-----------|
| `/` | LoginPage | No |
| `/register` | RegisterPage | No |
| `/questions` | QuestionFeedPage | Yes |
| `/questions/new` | CreateQuestionPage | Yes |
| `/questions/challenged` | ChallengedQuestionsPage | Yes |
| `/questions/:id` | QuestionDetailPage | Yes |
| `/profile/:userId` | ProfilePage | Yes |
| `/profile/edit` | EditProfilePage | Yes |
| `/leaderboard` | LeaderboardPage | Yes |

Note: `/questions/challenged` must be defined before `/questions/:id` in the router to avoid param capture.

## Shared Components

- **Navbar**: Responsive with hamburger menu. Links: Questions, Add Question, Challenged, Leaderboard, Profile.
- **ProtectedRoute**: Redirects to `/` if not authenticated.
- **LoadingSpinner**: Reusable spinner for async operations.
