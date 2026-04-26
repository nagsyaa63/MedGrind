# MedGrind File Map

## Server

```
server/
  src/
    app.js                          — Express app setup (CORS, body parser, routes, error handler)
    config/
      index.js                      — Env config (PORT, MONGODB_URI, JWT_SECRET, CORS_ORIGIN, NODE_ENV)
      constants.js                  — All backend constants (points, thresholds, limits, enums)
    models/
      User.js                       — User schema + indexes
      Question.js                   — Question schema + embedded challenge subdoc + indexes
      Answer.js                     — Answer schema + compound unique index
    repositories/
      userRepository.js             — User data access (findById, create, atomicPointsUpdate, etc.)
      questionRepository.js         — Question data access (filters, challenges, aggregation)
      answerRepository.js           — Answer data access (create, findByUserAndQuestion)
    services/
      authService.js                — Register, login, getMe
      questionService.js            — CRUD, feed with filters, challenged questions
      answerService.js              — Submit answer, correctness check
      votingService.js              — Like/downvote/approve toggles, auto-hide
      challengeService.js           — Challenge submission, voting, auto-resolution
      userService.js                — Profile, leaderboard, streak tracking
    controllers/
      authController.js             — Auth request/response handling
      questionController.js         — Question request/response handling
      answerController.js           — Answer request/response handling
      votingController.js           — Voting request/response handling
      challengeController.js        — Challenge request/response handling
      userController.js             — User request/response handling
    routes/
      auth.js                       — /api/auth/* routes
      questions.js                  — /api/questions/* routes (includes answer, voting, challenge)
      users.js                      — /api/users/* routes
    middleware/
      auth.js                       — JWT verification, attaches req.user
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
    App.jsx                         — React Router setup (all routes)
    main.jsx                        — App entry point (AuthProvider wrapper)
    config/
      constants.js                  — Frontend constants (subjects, difficulties, colors, pagination)
    api/
      apiClient.js                  — Axios instance + JWT interceptor (request/response)
    context/
      AuthContext.jsx               — Auth state provider (user, token, login, register, logout)
    components/
      Navbar.jsx                    — Navigation bar (responsive, hamburger menu)
      ProtectedRoute.jsx            — Auth guard (redirects to login if unauthenticated)
      LoadingSpinner.jsx            — Reusable loading spinner
    pages/
      LoginPage.jsx                 — Login form
      RegisterPage.jsx              — Registration form
      QuestionFeedPage.jsx          — Question list with filters + pagination
      CreateQuestionPage.jsx        — New question form
      QuestionDetailPage.jsx        — Full question view + answer + voting + challenge
      ChallengedQuestionsPage.jsx   — Challenged questions with grouped vote suggestions
      ProfilePage.jsx               — User profile view
      EditProfilePage.jsx           — Edit own profile
      LeaderboardPage.jsx           — Points leaderboard
```
