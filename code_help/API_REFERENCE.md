# MedGrind API Reference

Base URL: `/api`

All protected endpoints require `Authorization: Bearer <JWT>` header.
Error format (all endpoints): `{ error: "message" }`

## Auth

| Method | Path | Auth | Rate Limited | Description |
|--------|------|------|-------------|-------------|
| POST | `/api/auth/firebase` | No | Yes (20/15min) | Exchange Firebase ID token for app JWT. Creates or upserts user. Returns `{ user, token }` |
| GET | `/api/auth/me` | Yes | No | Current user profile |

### POST `/api/auth/firebase`

Request body:
```json
{ "firebaseIdToken": "<Firebase ID token from client SDK>" }
```

Response `200`:
```json
{
  "user": { "_id": "...", "name": "...", "email": "...", "isOnboarded": false, ... },
  "token": "<JWT>"
}
```

Errors:
- `400` — `firebaseIdToken` missing
- `401` — Firebase token invalid or expired

### Onboarding Flow

New Google users have `isOnboarded: false`. They must complete onboarding by calling `PUT /api/users/profile` with `collegeName` and `currentYear`. Once both are set, `isOnboarded` is automatically set to `true`.

## Questions

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/questions` | Yes | Feed with filters (subject, difficulty, page, limit, sortBy). Unanswered-first sorting. |
| POST | `/api/questions` | Yes | Create question (+2 points to author) |
| GET | `/api/questions/challenged` | Yes | Questions with challenge count ≥ threshold |
| GET | `/api/questions/:id` | Yes | Question detail (includes hidden questions) |
| DELETE | `/api/questions/:id` | Yes | Delete own question (403 if not author) |

## Answers

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/questions/:id/answer` | Yes | Submit answer. +10 points if correct. 409 if already answered. |

## Voting

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/questions/:id/like` | Yes | Toggle like (±3 pts to author). Mutual exclusive with downvote. |
| POST | `/api/questions/:id/downvote` | Yes | Toggle downvote (∓3 pts to author). Auto-hides at net ≥5. |
| POST | `/api/questions/:id/approve` | Yes | Toggle approval (±5 pts to author). Independent of like/downvote. |

Self-voting on any type returns 403.

## Challenges

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/questions/:id/challenge` | Yes | Submit challenge with suggestedCorrectOptions |
| POST | `/api/questions/:id/challenge/:challengeId/vote` | Yes | Vote on challenge suggestion. 409 if already voted. 400 if resolved. |

Auto-resolution: when a suggestion group reaches RESOLUTION_THRESHOLD (10) votes, correctOptions are updated and challenger gets +7 points.

## Users

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/users/leaderboard` | Yes | Leaderboard sorted by points desc |
| GET | `/api/users/:id` | Yes | User public profile |
| PUT | `/api/users/profile` | Yes | Update own profile (name, collegeName, currentYear, bio). Sets `isOnboarded: true` when collegeName + currentYear are both valid. |
