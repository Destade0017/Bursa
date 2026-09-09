# Bursar Pay — Cloud Deployment Guide

This guide provides step-by-step instructions for deploying the **Bursar Pay** automated school fee reconciliation platform to production hosting platforms.

---

## 🏗️ Architectural Summary

- **Backend**: Express.js (Node.js) API hosted on [Render](https://render.com)
- **Frontend**: Vite / React Single Page Application hosted on [Vercel](https://vercel.com) or Render Static Sites
- **Database**: PostgreSQL (hosted on [Supabase](https://supabase.com), [Neon](https://neon.tech), or Render Postgres) via Prisma ORM
- **Payment Gateway**: Paystack (Dedicated Virtual Accounts & HMAC-SHA512 Webhooks)

---

## Step 1: Provision Cloud PostgreSQL Database

1. Create a free PostgreSQL database on **Supabase** or **Neon**.
2. Retrieve your database connection string:
   ```env
   DATABASE_URL="postgresql://user:password@ep-sample-12345.us-east-1.aws.neon.tech/bursar_db?sslmode=require"
   ```
3. Run database migrations to provision production tables (`School`, `Student`, `VirtualAccount`, `Invoice`, `SuspenseTransaction`):
   ```bash
   npx prisma migrate deploy
   ```
4. (Optional) Seed initial school roster:
   ```bash
   npx prisma db seed
   ```

---

## Step 2: Deploy Express Backend (Render)

1. Push your repository to GitHub or GitLab.
2. Sign in to [Render](https://dashboard.render.com) and click **New +** -> **Web Service**.
3. Connect your repository.
4. Set the build settings:
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build` *(Runs `prisma generate` to compile native query engine binaries)*
   - **Start Command**: `npm start` *(Executes `node src/server.js`)*
5. Configure Environment Variables in Render Dashboard:
   | Variable | Value / Description |
   |---|---|
   | `PORT` | `5001` |
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | *Your PostgreSQL Connection String* |
   | `PAYMENT_PROVIDER` | `MOCK` *(or `PAYSTACK` for live API)* |
   | `PAYSTACK_SECRET_KEY` | `sk_live_xxxx...` or `sk_test_xxxx...` |
   | `FRONTEND_URL` | `https://your-app.vercel.app` *(Frontend URL for CORS)* |

6. Deploy the service and copy the backend URL (e.g., `https://bursa-backend.onrender.com`).

---

## Step 3: Deploy Vite React Frontend (Vercel)

1. Sign in to [Vercel](https://vercel.com) and click **Add New Project**.
2. Select your repository and choose the `frontend` directory as the Root Directory.
3. Vercel automatically detects **Vite**:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add Environment Variable:
   - `VITE_API_URL`: `https://bursa-backend.onrender.com`
5. Click **Deploy**.

---

## Step 4: Configure Paystack Live Webhook

1. Log into your **Paystack Dashboard** (`https://dashboard.paystack.com`).
2. Navigate to **Settings** -> **API Keys & Webhooks**.
3. Under **Webhook URL**, enter your deployed backend endpoint:
   ```
   https://bursa-backend.onrender.com/api/webhooks/paystack
   ```
4. Copy your `Secret Key` and verify it matches the `PAYSTACK_SECRET_KEY` set in your Render environment variables.
5. All live bank transfer events to Dedicated Virtual Accounts (DVAs) will now automatically trigger HMAC-SHA512 signature verification and instant invoice reconciliation!

---

## ⚡ Technical Gotchas & Senior Dev Notes

### Why `prisma generate` is required in the build script
Render and cloud hosts build applications inside isolated, ephemeral Linux containers. Running `prisma generate` during `npm run build` forces Prisma to compile host-native C++ binary query engines for Linux (`debian-openssl-3.0.x`) inside the container. Without this, runtime database queries fail with missing engine errors.

### Why Vite requires the `VITE_` prefix
Vite statically replaces environment variables during frontend bundling. To safeguard secret keys (like database credentials or Paystack private keys) from accidentally being compiled into client-side JavaScript viewed by users, Vite **only exposes** environment variables explicitly prefixed with `VITE_`.
