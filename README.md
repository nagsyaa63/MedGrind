# MedGrind

**LeetCode for Medical Students** — A community-driven MCQ platform to create, answer, vote on, and challenge medical questions.

## About

MedGrind helps medical students sharpen their knowledge through collaborative practice. Students contribute questions across clinical and pre-clinical subjects, answer peers' questions, vote on quality, and challenge incorrect answers — all while earning points, maintaining streaks, and climbing the leaderboard.

## Features

- **Google Sign-In** — One-click authentication via Google Firebase OAuth. No passwords.
- **MCQ Creation** — Create single or multiple-correct-answer questions across 19 medical subjects with difficulty levels
- **Answer & Learn** — Submit answers, get instant correctness feedback with explanations
- **Voting System** — Like, downvote, or approve questions; low-quality questions auto-hide at 5 net downvotes
- **Answer Challenges** — Dispute incorrect answers with reasoning; community resolves at 10 agrees
- **Points & Gamification** — Earn points for contributing, answering correctly, receiving votes, and resolving challenges
- **Leaderboard** — Compete with peers ranked by total points
- **Daily Streaks** — Track consecutive days of activity for bonus points
- **Unanswered-First Feed** — Questions you haven't answered appear first, with subject and difficulty filters

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS + React Router v7 |
| Backend | Node.js + Express.js v5 |
| Database | MongoDB + Mongoose ODM |
| Auth | Google Firebase OAuth + JWT (1-day expiry) |

## Local Development Setup

### Prerequisites

- **Node.js 18+** and npm
- **MongoDB** — local install or [MongoDB Atlas](https://www.mongodb.com/atlas) free tier
- **Firebase project** — with Google sign-in enabled (see [Firebase Console](https://console.firebase.google.com))

### Getting Started

1. **Clone the repo**

   ```bash
   git clone <repo-url>
   cd medgrind
   ```

2. **Install dependencies**

   ```bash
   npm install --prefix server
   npm install --prefix client
   ```

3. **Configure environment variables**

   ```bash
   cp server/.env.example server/.env
   cp client/.env.example client/.env
   ```

   Edit `server/.env`:

   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/medgrind
   JWT_SECRET=your_secret_key_here
   CORS_ORIGIN=http://localhost:5173
   NODE_ENV=development

   # Firebase Admin SDK (from Firebase Console → Project Settings → Service Accounts)
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```

   Edit `client/.env`:

   ```
   VITE_API_URL=http://localhost:5000/api

   # Firebase Client SDK (from Firebase Console → Project Settings → Your apps)
   VITE_FIREBASE_API_KEY=your-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   VITE_FIREBASE_APP_ID=your-app-id
   ```

4. **Start the backend**

   ```bash
   npm run dev --prefix server
   ```

   Server runs at `http://localhost:5000`.

5. **Start the frontend**

   ```bash
   npm run dev --prefix client
   ```

   Client runs at `http://localhost:5173`.

6. **Sign in** — Open `http://localhost:5173`, click "Sign in with Google". New users are prompted to complete their profile (college name + year of study) before accessing the app.

## Running Tests

```bash
npm test --prefix server
```

All 131 unit + property-based tests should pass.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

Please keep PRs focused and include a clear description of the change.

## License

This project is licensed under the [MIT License](LICENSE).
