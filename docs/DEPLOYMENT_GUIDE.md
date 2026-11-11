# ClientOutfy — Step-by-Step Deployment Guide

This guide provides end-to-end instructions for deploying all components of the ClientOutfy ecosystem.

---

## 1. Database Setup (Supabase)

1. Create a free account or log in at [supabase.com](https://supabase.com).
2. Create a new project (e.g., `clientoutfy-db`) and note your database password.
3. Once the project is provisioned, navigate to the **SQL Editor** from the left navigation panel.
4. Open [`database/supabase_full_setup.sql`](file:///h:/Rasel/all_local_Projecrt/ClientOutfy-/database/supabase_full_setup.sql) from this repository, copy the entire SQL script, paste it into the Supabase SQL editor, and click **RUN**.
5. Verify in the **Table Editor** that the following 6 tables have been created:
   - `admins`
   - `email_events`
   - `licenses`
   - `payments`
   - `plans`
   - `settings`
6. Go to **Project Settings** → **API**:
   - Copy the **Project URL** (e.g., `https://xyz.supabase.co`).
   - Copy the **anon (public)** key.
   - Copy the **service_role (secret)** key (keep this confidential!).

---

## 2. Deploying Backend API (`apps/backend-api`) to Vercel

1. Log in to [vercel.com](https://vercel.com) using your GitHub account.
2. Click **Add New** → **Project** → Import your `ClientOutfy-` repository.
3. Configure the project:
   - **Project Name:** `clientoutfy-backend`
   - **Framework Preset:** `Other`
   - **Root Directory:** Click `Edit` and select `apps/backend-api`
   - **Build & Output Settings:** Leave default (empty)
4. Add the following **Environment Variables**:
   - `SUPABASE_URL`: Your Supabase Project URL.
   - `SUPABASE_SERVICE_KEY`: Your Supabase `service_role` secret key.
5. Click **Deploy**.
6. Note the deployed URL (e.g., `https://clientoutfy-backend.vercel.app`).

---

## 3. Deploying Admin Dashboard (`apps/admin-dashboard`) to Vercel

1. Open [`apps/admin-dashboard/index.html`](file:///h:/Rasel/all_local_Projecrt/ClientOutfy-/apps/admin-dashboard/index.html):
   - Locate lines 403-404:
     ```javascript
     const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
     const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
     ```
   - Update them with your Supabase Project URL and public anon key.
2. In Vercel, click **Add New** → **Project** → Import `ClientOutfy-`.
3. Configure:
   - **Project Name:** `clientoutfy-dashboard`
   - **Framework Preset:** `Other`
   - **Root Directory:** Select `apps/admin-dashboard`
   - **Build Command:** Leave empty
   - **Output Directory:** `./`
4. Click **Deploy**.
5. Open your deployed dashboard URL:
   - **Default Username:** `admin`
   - **Default Password:** `admin123`
6. **Immediately change your password** in Dashboard → **Settings** → **Admin Password**.
7. Configure your bKash, Nagad, and Rocket numbers in **Settings**.

---

## 4. Deploying Email Server

### Option A: Brevo API (`apps/email-server-brevo`) — Recommended on Vercel
1. Create a free account at [brevo.com](https://www.brevo.com) and retrieve your API key (**Settings** → **SMTP & API** → **API Keys**).
2. In Vercel, import `ClientOutfy-`, set root directory to `apps/email-server-brevo`.
3. Add environment variable:
   - `BREVO_API_KEY`: Your Brevo v3 API key.
4. Deploy and save the URL.

### Option B: Custom SMTP Server (`apps/email-server-smtp`) — Render/VPS
1. Log in to [render.com](https://render.com).
2. Create a new **Web Service**, link the repository, set root directory to `apps/email-server-smtp`.
3. Set build command: `npm install` and start command: `node server.js`.

---

## 5. Deploying WhatsApp Server (`apps/whatsapp-server`)

1. In Render or on any Linux VPS, configure a new Node.js Web Service for `apps/whatsapp-server`.
2. Build command: `npm install`
3. Start command: `node server.js`
4. Once running, scan the QR code to pair your WhatsApp account via Baileys multi-file auth.

---

## 6. Installing & Configuring the Chrome Extension (`apps/chrome-extension`)

1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** toggle in the top-right corner.
3. Click **Load unpacked** and select the folder:
   `apps/chrome-extension`
4. If you deployed your own backend or servers, update the API endpoints in:
   - `background.js` (Lines 8-15)
   - `popup.js` (Line 10)
5. Pin the **ClientOutfy Ai Pro** extension in Chrome.
6. Open the extension, navigate to the **Account** tab, paste a license key generated from your Admin Dashboard, and click **Activate**.
7. Start harvesting leads from Google Maps!

