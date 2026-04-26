# MedGrind Data Models

3 collections, all with Mongoose `timestamps` (auto `createdAt`/`updatedAt`).

## User

```
name             String, required, trimmed
email            String, required, unique, lowercase
password         String, optional, min 6 (bcrypt hash — only present for legacy users)
firebaseUid      String, optional, sparse unique index (set on first Google sign-in)
isOnboarded      Boolean, default false (true once collegeName + currentYear are set)
collegeName      String, optional, trimmed (required to complete onboarding)
currentYear      Number, optional, 1–6 (required to complete onboarding)
bio              String, default '', max 200
points           Number, default 0, min 0
questionsAdded   Number, default 0
questionsAnswered Number, default 0
correctAnswers   Number, default 0
streak           Number, default 0
lastActiveDate   Date, default null (midnight UTC of last activity)
```

Indexes:
- `{ email: 1 }` unique (declared inline in schema field)
- `{ points: -1 }` (leaderboard sorting)
- `{ firebaseUid: 1 }` unique + sparse (sparse = allows multiple null values)

### User Lifecycle

1. **New Google user** — created with `firebaseUid`, `email`, `name`. `isOnboarded: false`. Must complete onboarding.
2. **Onboarded user** — has `collegeName` + `currentYear`. `isOnboarded: true`. Full access.
3. **Legacy user** — had email/password before Firebase migration. On first Google sign-in, `firebaseUid` is linked atomically. If profile was already complete, `isOnboarded` is set to `true` automatically.

## Question

```
author           ObjectId → User, required
questionText     String, required, max 1000
options          { A, B, C, D } — each String, required, max 300
correctOptions   [String enum A/B/C/D], required
questionType     'single' | 'multiple' (derived from correctOptions.length)
subject          String, required, enum ALLOWED_SUBJECTS
difficulty       'Easy' | 'Medium' | 'Hard'
explanation      String, default ''

likes            [ObjectId → User]
likeCount        Number, default 0
downvotes        [ObjectId → User]
downvoteCount    Number, default 0
approvals        [ObjectId → User]
approvalCount    Number, default 0
isHidden         Boolean, default false (auto-set when net downvotes ≥ 5)

totalAttempts    Number, default 0
correctAttempts  Number, default 0

challenges       [Challenge subdocument]
```

Indexes: `{ subject: 1, difficulty: 1 }`, `{ createdAt: -1 }`, `{ isHidden: 1 }`

### Challenge Subdocument (embedded in Question)

```
user                    ObjectId → User, required
reasoning               String, default '', max 500
suggestedCorrectOptions [String enum A/B/C/D]
votes                   [ObjectId → User]
voteCount               Number, default 0
resolved                Boolean, default false
```

## Answer

```
user             ObjectId → User, required
question         ObjectId → Question, required
selectedOptions  [String enum A/B/C/D], required
isCorrect        Boolean, required (computed at submission time)
```

Index: `{ user: 1, question: 1 }` (compound unique — one answer per user per question)
