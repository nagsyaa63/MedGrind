# Server Spec Summary

## Full Specs

- `.kiro/specs/medgrind-platform/` — Original platform spec (auth, questions, answers, voting, challenges, points, streaks, leaderboard)
- `.kiro/specs/medgrind-refactor/` — Refactor spec (repository layer, challenge UX redesign, constants extraction)

## Architecture

Layered backend with repository pattern:

```
Routes → Controllers → Services → Repositories → Models (Mongoose)
```

Points Engine uses UserRepository for atomic updates.

## Key Features

- **Auth**: Register/login with JWT (7d expiry), bcrypt password hashing, rate-limited endpoints
- **Questions**: CRUD, feed with subject/difficulty filters, unanswered-first sorting, pagination
- **Answers**: Submit + correctness check, one-per-user-per-question (compound unique index)
- **Voting**: Like/downvote (mutually exclusive) + approval (independent), auto-hide at net downvotes ≥ 5
- **Challenges**: Submit challenge with suggested correct options, vote-based resolution, auto-resolve at threshold
- **Points Engine**: Atomic `$inc` with floor-of-zero, all deltas from constants
- **Streaks**: Daily login tracking, +1 point per consecutive day
- **Leaderboard**: Users sorted by points descending

## Constants

All configurable values in `src/config/constants.js` — point values, thresholds, pagination, rate limits, field lengths, enums.
