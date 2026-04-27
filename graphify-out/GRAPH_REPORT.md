# Graph Report - med_learn  (2026-04-22)

> **⚠️ Graph last updated before `feature/addDropdownForCollegesSelect`.**
> The following new nodes were added and are NOT yet reflected in the graph:
> - `collegeService` — `server/src/services/collegeService.js` — singleton, loads `colleges.json` at startup
> - `useColleges()` — `client/src/hooks/useColleges.js` — module-cached fetch of `/api/colleges`
> - `GET /api/colleges` — `server/src/routes/colleges.js` → `collegeController.js` → `collegeService.js`

## Corpus Check
- 63 files · ~32,826 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 169 nodes · 165 edges · 7 communities detected
- Extraction: 70% EXTRACTED · 30% INFERRED · 0% AMBIGUOUS · INFERRED: 50 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 13|Community 13]]

## God Nodes (most connected - your core abstractions)
1. `QuestionRepository` - 13 edges
2. `UserRepository` - 12 edges
3. `updatePoints()` - 9 edges
4. `useAuth()` - 9 edges
5. `firebaseAuth()` - 7 edges
6. `submitAnswer()` - 6 edges
7. `updateStreak()` - 5 edges
8. `AnswerRepository` - 4 edges
9. `toggleLike()` - 4 edges
10. `toggleDownvote()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `auth()` --calls--> `updateStreak()`  [INFERRED]
  server/src/middleware/auth.js → server/src/services/userService.js
- `updatePoints()` --calls--> `submitAnswer()`  [INFERRED]
  server/src/utils/pointsEngine.js → server/src/services/answerService.js
- `updatePoints()` --calls--> `createQuestion()`  [INFERRED]
  server/src/utils/pointsEngine.js → server/src/services/questionService.js
- `useAuth()` --calls--> `ProtectedRoute()`  [INFERRED]
  client/src/context/AuthContext.jsx → client/src/components/ProtectedRoute.jsx
- `useAuth()` --calls--> `Navbar()`  [INFERRED]
  client/src/context/AuthContext.jsx → client/src/components/Navbar.jsx

## Communities

### Community 0 - "Community 0"
Cohesion: 0.11
Nodes (10): useAuth(), EditProfilePage(), LoginPage(), Navbar(), OnboardingPage(), ProfilePage(), ProtectedRoute(), groupChallenges() (+2 more)

### Community 1 - "Community 1"
Cohesion: 0.21
Nodes (8): createChallenge(), voteChallenge(), updatePoints(), QuestionRepository, updateStreak(), toggleApproval(), toggleDownvote(), toggleLike()

### Community 2 - "Community 2"
Cohesion: 0.14
Nodes (5): auth(), firebaseAuth(), generateToken(), getMe(), UserRepository

### Community 3 - "Community 3"
Cohesion: 0.14
Nodes (5): getQuestion(), deleteQuestion(), getChallengedQuestions(), getQuestionById(), getQuestions()

### Community 4 - "Community 4"
Cohesion: 0.2
Nodes (5): submitAnswer(), createQuestion(), getLeaderboard(), getProfile(), updateProfile()

### Community 6 - "Community 6"
Cohesion: 0.4
Nodes (1): AnswerRepository

### Community 13 - "Community 13"
Cohesion: 0.67
Nodes (1): AppError

## Knowledge Gaps
- **Thin community `Community 6`** (5 nodes): `AnswerRepository`, `.constructor()`, `.create()`, `.findByUserAndQuestion()`, `answerRepository.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 13`** (3 nodes): `AppError`, `.constructor()`, `AppError.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `UserRepository` connect `Community 2` to `Community 4`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `QuestionRepository` connect `Community 1` to `Community 3`, `Community 4`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `getQuestionById()` connect `Community 3` to `Community 1`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Are the 8 inferred relationships involving `updatePoints()` (e.g. with `.atomicPointsUpdate()` and `updateStreak()`) actually correct?**
  _`updatePoints()` has 8 INFERRED edges - model-reasoned connections that need verification._
- **Are the 8 inferred relationships involving `useAuth()` (e.g. with `ProtectedRoute()` and `Navbar()`) actually correct?**
  _`useAuth()` has 8 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `firebaseAuth()` (e.g. with `auth()` and `.findByFirebaseUid()`) actually correct?**
  _`firebaseAuth()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._