# Deployment Guide

Step-by-step instructions for deploying MedGrind to free-tier hosting: MongoDB Atlas (database), Render.com (backend), and Vercel (frontend).

## Prerequisites

- Node.js 18+ and npm installed locally
- Git and a GitHub account with the repo pushed
- Accounts on: [MongoDB Atlas](https://www.mongodb.com/atlas), [Render.com](https://render.com), [Vercel](https://vercel.com)
- A Firebase project with Google sign-in enabled ([Firebase Console](https://console.firebase.google.com))

---

## 1. Firebase Setup

### Enable Google Sign-In
1. Go to [Firebase Console](https://console.firebase.google.com) → your project → **Authentication** → **Sign-in method**
2. Enable **Google** as a sign-in provider
3. Add your production domain (Vercel URL) to **Authorized domains**

### Get Client SDK Config (for frontend)
1. Go to **Project Settings** → **Your apps** → select your web app (or create one)
2. Copy the Firebase config object — you'll need these values for Vercel env vars:
   - `apiKey`, `authDomain`, `projectId`, `messagingSenderId`, `appId`

### Get Admin SDK Credentials (for backend)
1. Go to **Project Settings** → **Service accounts**
2. Click **Generate new private key** → download the JSON file
3. You'll need: `project_id`, `client_email`, `private_key` from this file

---

## 2. MongoDB Atlas Setup

1. Log in to [MongoDB Atlas](https://cloud.mongodb.com) and create a new project.
2. Click **Build a Database** → select the **M0 Free** tier → choose a cloud provider and region.
3. Create a database user:
   - Go to **Database Access** → **Add New Database User**
   - Set a username and a strong password (save these — you'll need them for the connection string)
4. Whitelist network access:
   - Go to **Network Access** → **Add IP Address**
   - Add `0.0.0.0/0` to allow connections from any IP (required for Render)
5. Get the connection string:
   - Go to **Database** → **Connect** → **Connect your application**
   - Copy the connection string:
     ```
     mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/medgrind?retryWrites=true&w=majority
     ```
   - Replace `<username>` and `<password>` with your database user credentials.

---

## 3. Deploy Backend to Render.com

1. Log in to [Render.com](https://dashboard.render.com) and click **New** → **Web Service**.
2. Connect your GitHub repository.
3. Configure the service:

   | Setting | Value |
   |---------|-------|
   | **Name** | `medgrind-api` |
   | **Root Directory** | `server` |
   | **Build Command** | `npm install` |
   | **Start Command** | `node src/app.js` |

4. Add environment variables under **Environment**:

   | Variable | Value |
   |----------|-------|
   | `MONGODB_URI` | Your Atlas connection string from step 2 |
   | `JWT_SECRET` | A long random string (generate with `openssl rand -hex 32`) |
   | `CORS_ORIGIN` | Your Vercel frontend URL (set after step 4, e.g., `https://medgrind.vercel.app`) |
   | `NODE_ENV` | `production` |
   | `FIREBASE_PROJECT_ID` | `project_id` from your Admin SDK JSON |
   | `FIREBASE_CLIENT_EMAIL` | `client_email` from your Admin SDK JSON |
   | `FIREBASE_PRIVATE_KEY` | `private_key` from your Admin SDK JSON — paste the full value including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`, with literal `\n` for newlines |

5. Click **Create Web Service**. Render will build and deploy automatically.
6. Copy the service URL (e.g., `https://medgrind-api.onrender.com`) — you'll need it for the frontend.

---

## 4. Deploy Frontend to Vercel

1. Log in to [Vercel](https://vercel.com) and click **Add New** → **Project**.
2. Import your GitHub repository.
3. Configure the project:

   | Setting | Value |
   |---------|-------|
   | **Root Directory** | `client` |
   | **Framework Preset** | Vite |

4. Add environment variables:

   | Variable | Value |
   |----------|-------|
   | `VITE_API_URL` | Your Render backend URL + `/api` (e.g., `https://medgrind-api.onrender.com/api`) |
   | `VITE_FIREBASE_API_KEY` | From Firebase Client SDK config |
   | `VITE_FIREBASE_AUTH_DOMAIN` | From Firebase Client SDK config |
   | `VITE_FIREBASE_PROJECT_ID` | From Firebase Client SDK config |
   | `VITE_FIREBASE_MESSAGING_SENDER_ID` | From Firebase Client SDK config |
   | `VITE_FIREBASE_APP_ID` | From Firebase Client SDK config |

5. Click **Deploy**. Vercel will build and deploy the frontend.
6. After deployment, copy the Vercel URL and:
   - Go back to Render → update `CORS_ORIGIN` to your Vercel URL (e.g., `https://medgrind.vercel.app`). Render will redeploy automatically.
   - Go to Firebase Console → **Authentication** → **Settings** → **Authorized domains** → add your Vercel URL.

---

## 5. Post-Deployment Verification

1. Open the Vercel frontend URL in your browser.
2. Click **Sign in with Google** — confirm the popup opens and completes.
3. New users should be redirected to the onboarding page to enter college name and year.
4. After onboarding, confirm you're redirected to the question feed.
5. Create a question, submit an answer, and verify points update.
6. Check the leaderboard page loads correctly.

---

## 6. Common Issues

### CORS Errors

If you see CORS errors in the browser console:
- Verify `CORS_ORIGIN` on Render matches your exact Vercel URL (no trailing slash).
- Redeploy the backend after updating.

### Firebase Popup Blocked

If the Google sign-in popup is blocked:
- Ensure your Vercel domain is in Firebase **Authorized domains**.
- The `Cross-Origin-Opener-Policy would block window.close` warning in the console is a harmless browser log from Google's own `gapi.js` — it does not affect functionality.

### Firebase Admin SDK Private Key

If you see `Error: Failed to parse private key` on Render:
- The `FIREBASE_PRIVATE_KEY` must include the full key with `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`.
- Newlines must be literal `\n` characters (not actual line breaks) when pasting into Render's env var UI.
- Render automatically handles the `\n` → newline conversion when the value is quoted.

### Render Cold Starts

Render's free tier spins down the service after ~15 minutes of inactivity. The first request after idle takes 30–60 seconds to respond. This is normal for the free tier.

### MongoDB Connection Failures

- Verify the `MONGODB_URI` is correct and the `<password>` placeholder is replaced.
- Confirm `0.0.0.0/0` is in Atlas Network Access.
- Check that the database user has **readWriteAnyDatabase** permissions.

---

## 7. Optional: Keep Render Awake

To avoid cold starts, set up a free monitoring service to ping your backend periodically:

1. Sign up at [UptimeRobot](https://uptimerobot.com) (free tier).
2. Add a new **HTTP(s)** monitor pointing to your Render health endpoint (e.g., `https://medgrind-api.onrender.com/api/auth/me`).
3. Set the monitoring interval to **5 minutes**.

This keeps the Render service warm by sending regular requests.
