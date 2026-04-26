# MedGrind File Map

## Server

```
server/
  src/
    app.js                          — Express app setup (CORS with preflight, body parser, routes, error handler)
    config/
      index.js                      — Env config (PORT, MONGODB_URI, JWT_SECRET, CORS_ORIGIN, NODE_ENV, FIREBASE_*)
      constants.js                  — All backend constants (points, thresholds, limits, enums, Firebase error messages)
      firebase.js                   — Firebase Admin SDK singleton initialization
    models/
      User.js                       — User schema + indexes (firebaseUid sparse unique, points desc, email unique inline)
      Question.js                   — Question schema + embedded challenge subdoc + indexes
      Answer.js                     — Answer schema + compound unique index
    repositories/
      userRepository.js             — User data access (findById, findByFirebaseUid, findByEmailAndSetFirebaseUid, atomicPointsUpdate, etc.)
      questionRepository.js         — Question data access (filters, challenges, aggregation)
      answerRepository.js           — Answer data access (create, findByUserAndQuestion)
    services/
      authService.js                — firebaseAuth (3-step upsert), getMe
      questionService.js            — CRUD, feed with filters, challenged questions
      answerService.js              — Submit answer, correctness check
      votingService.js              — Like/downvote/approve toggles, auto-hide
      challengeService.js           — Challenge submission, voting, auto-resolution
      userService.js                — Profile, leaderboard, streak tracking, onboarding completion
    controllers/
      authController.js             — Auth request/response handling
      questionController.js         — Question request/response handling
      answerController.js           — Answer request/response handling
      votingController.js           — Voting request/response handling
      challengeController.js        — Challenge request/response handling
      userController.js             — User request/response handling
    routes/
      auth.js                       — POST /api/auth/firebase, GET /api/auth/me
      questions.js                  — /api/questions/* routes (includes answer, voting, challenge)
      users.js                      — /api/users/* routes
    middleware/
      auth.js                       — JWT verification, attaches req.user, daily streak trigger
      rateLimiter.js                — Rate limiting for auth endpoints (20/15min)
      errorHandler.js               — Global error handler ({ error: "message" })
    utils/
      pointsEngine.js               — updatePoints(userId, action) — atomic $inc + floor-of-zero
      AppError.js                   — Custom error class with statusCode
```

## Client

```
client/
  src/
    App.jsx                         — React Router setup (all routes, / login, /onboarding, protected routes)
    main.jsx                        — App entry point (AuthProvider wrapper)
    config/
      constants.js                  — Frontend constants (subjects, difficulties, colors, pagination)
      firebase.js                   — Firebase Client SDK init (auth, googleProvider)
    api/
      apiClient.js                  — Axios instance + JWT interceptor (request/response)
    context/
      AuthContext.jsx               — Auth state provider (user, token, isAuthenticated, isOnboarded, signInWithGoogle, logout, updateProfile)
    components/
      Navbar.jsx                    — Navigation bar (responsive, hamburger menu)
      ProtectedRoute.jsx            — Auth + onboarding guard (redirects to / or /onboarding)
      LoadingSpinner.jsx            — Reusable loading spinner
    pages/
      LoginPage.jsx                 — Google Sign-In button (replaces email/password form)
      OnboardingPage.jsx            — Collect collegeName + currentYear for new Google users
      QuestionFeedPage.jsx          — Question list with filters + pagination
      CreateQuestionPage.jsx        — New question form
      QuestionDetailPage.jsx        — Full question view + answer + voting + challenge
      ChallengedQuestionsPage.jsx   — Challenged questions with grouped vote suggestions
      ProfilePage.jsx               — User profile view
      EditProfilePage.jsx           — Edit own profile
      LeaderboardPage.jsx           — Points leaderboard
```
