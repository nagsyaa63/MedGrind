# Deployment Guide

Step-by-step instructions for deploying MedGrind to free-tier hosting: MongoDB Atlas (database), Render.com (backend), and Vercel (frontend).

## Prerequisites

- Node.js 18+ and npm installed locally
- Git and a GitHub account with the repo pushed
- Accounts on: [MongoDB Atlas](https://www.mongodb.com/atlas), [Render.com](https://render.com), [Vercel](https://vercel.com)

---

## 1. MongoDB Atlas Setup

1. Log in to [MongoDB Atlas](https://cloud.mongodb.com) and create a new project.
2. Click **Build a Database** → select the **M0 Free** tier → choose a cloud provider and region.
3. Create a database user:
   - Go to **Database Access** → **Add New Database User**
   - Set a username and a strong password (save these — you'll need them for the connection string)
4. Whitelist network access:
   - Go to **Network Access** → **Add IP Address**
   - Add `0.0.0.0/0` to allow connections from any IP (required for cloud deployments like Render and Vercel)
5. Get the connection string:
   - Go to **Database** → **Connect** → **Connect your application**
   - Copy the connection string — it looks like:
     ```
     mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/medgrind?retryWrites=true&w=majority
     ```
   - Replace `<username>` and `<password>` with your database user credentials.

---

## 2. Deploy Backend to Render.com

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
   | `MONGODB_URI` | Your Atlas connection string from step 1 |
   | `JWT_SECRET` | A long random string (e.g., generate with `openssl rand -hex 32`) |
   | `CORS_ORIGIN` | Your Vercel frontend URL (set after step 3, e.g., `https://medgrind.vercel.app`) |
   | `NODE_ENV` | `production` |

5. Click **Create Web Service**. Render will build and deploy automatically.
6. Copy the service URL (e.g., `https://medgrind-api.onrender.com`) — you'll need it for the frontend.

---

## 3. Deploy Frontend to Vercel

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

5. Click **Deploy**. Vercel will build and deploy the frontend.
6. After deployment, copy the Vercel URL and go back to Render → update the `CORS_ORIGIN` env var to match (e.g., `https://medgrind.vercel.app`). Render will redeploy automatically.

---

## 4. Post-Deployment Verification

1. Open the Vercel frontend URL in your browser.
2. Register a new account — confirm you're redirected to the question feed.
3. Create a question, submit an answer, and verify points update.
4. Check the leaderboard page loads correctly.

---

## 5. Common Issues

### CORS Errors

If you see CORS errors in the browser console, verify that `CORS_ORIGIN` on Render matches your exact Vercel URL (no trailing slash). Redeploy the backend after updating.

### Render Cold Starts

Render's free tier spins down the service after ~15 minutes of inactivity. The first request after idle takes 30–60 seconds to respond. This is normal for the free tier.

### MongoDB Connection Failures

- Verify the `MONGODB_URI` is correct and the `<password>` placeholder is replaced.
- Confirm `0.0.0.0/0` is in Atlas Network Access.
- Check that the database user has **readWriteAnyDatabase** permissions.

---

## 6. Optional: Keep Render Awake

To avoid cold starts, set up a free monitoring service to ping your backend periodically:

1. Sign up at [UptimeRobot](https://uptimerobot.com) (free tier).
2. Add a new **HTTP(s)** monitor pointing to your Render health endpoint (e.g., `https://medgrind-api.onrender.com/api/auth/me`).
3. Set the monitoring interval to **5 minutes**.

This keeps the Render service warm by sending regular requests.
