# MedGrind Data Models

3 collections, all with Mongoose `timestamps` (auto `createdAt`/`updatedAt`).

## User

```
name             String, required, trimmed
email            String, required, unique, lowercase
password         String, required, min 6 (stored as bcrypt hash, never returned in API)
collegeName      String, required
currentYear      Number, required, 1–6
bio              String, default '', max 200
points           Number, default 0, min 0
questionsAdded   Number, default 0
questionsAnswered Number, default 0
correctAnswers   Number, default 0
streak           Number, default 0
lastActiveDate   Date, default null (midnight UTC of last activity)
```

Indexes: `{ email: 1 }` (unique), `{ points: -1 }` (leaderboard)

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
