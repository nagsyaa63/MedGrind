# Frontend Pages Reference

## LoginPage (/)
- Single "Sign in with Google" button with Google SVG icon
- Calls `AuthContext.signInWithGoogle()` (Firebase popup flow)
- If already authenticated: redirects to `/questions` (onboarded) or `/onboarding` (not onboarded)
- After sign-in: navigates to `/onboarding` or `/questions` based on `user.isOnboarded`
- Shows backend error via `err.response?.data?.error`
- `auth/popup-closed-by-user` is silently ignored (no error shown)

## OnboardingPage (/onboarding)
- Shown to authenticated users who have not yet completed their profile
- Fields: College / Institution (text), Year of Study 1–6 (number)
- Client-side validation with inline field-level error messages
- Calls `AuthContext.updateProfile({ collegeName, currentYear })`
- Server sets `isOnboarded: true` when both fields are valid
- Redirects to `/questions` on success
- Redirects unauthenticated users to `/`

## QuestionFeedPage (/questions)
- Fetches GET /api/questions with query params (subject, difficulty, sortBy, page, limit)
- Filter bar: subject dropdown, difficulty dropdown, sort selector
- Question cards: truncated text, subject tag, difficulty badge, author, vote counts, answered indicator
- Unanswered questions appear first (backend handles sorting)
- Pagination controls (prev/next)
- Empty state: welcome CTA to create first question
- Click card → navigate to /questions/:id

## CreateQuestionPage (/questions/new)
- Form: questionText (1000 char limit), 4 options A-D (300 char each), correct option checkboxes, subject, difficulty, explanation (optional, 500 char)
- Client-side validation for all field lengths
- POSTs to /api/questions, redirects to feed on success

## QuestionDetailPage (/questions/:id)
- Fetches GET /api/questions/:id
- "← Back to Feed" link at top
- Hidden question warning banner
- Answer section: option buttons (toggle select), submit, correct/incorrect feedback with green/red highlighting, explanation
- Voting section: like/downvote/approve buttons with counts + inline Challenge button
- Challenge button: gray → amber dropdown with A/B/C/D checkboxes → "Challenged" state
- Challenge suggestions: grouped by suggestedCorrectOptions, clickable vote cards
- Delete button (author only)

## ChallengedQuestionsPage (/questions/challenged)
- Fetches GET /api/questions/challenged
- Each question: text, options (correct highlighted green), subject/difficulty tags
- Challenge groups as amber pills: "A,C — 7 votes" (clickable to vote)
- Handles 409 (already voted), 400 (resolved)

## ProfilePage (/profile/:userId)
- Fetches GET /api/users/:userId
- Card: name, college, year, bio, member since date
- Stats grid: points, questions added/answered, correct answers, streak
- Edit Profile button if viewing own profile

## EditProfilePage (/profile/edit)
- Pre-populated form from AuthContext user data
- Fields: name, collegeName, currentYear, bio (200 char limit)
- PUTs to /api/users/profile via AuthContext.updateProfile()

## LeaderboardPage (/leaderboard)
- Fetches GET /api/users/leaderboard
- Ranked table: rank, name, college, points, correct answers, questions added
- Clickable rows → navigate to /profile/:userId
