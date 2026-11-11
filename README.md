# ClientOutfy — All-in-One Lead Generation, Scraping & Cold Outreach SaaS

[![GitHub release](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/MDRasel01/ClientOutfy-)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)
[![Database: Supabase](https://img.shields.io/badge/Database-Supabase%20PostgreSQL-3ECF8E.svg)](https://supabase.com)
[![Deployment: Vercel](https://img.shields.io/badge/Deploy-Vercel-black.svg)](https://vercel.com)

**ClientOutfy** (formerly LeadOutfy) is a 360° Lead Generation and Multi-Channel Cold Outreach Platform. It pairs a **24/7 Google Maps Lead Harvester** Chrome Extension with an **Automated WhatsApp & Email Outreach Engine**, managed via a full-featured **SaaS Admin Dashboard** with automated license verification, payment processing (bKash/Nagad/Rocket), and real-time open tracking analytics.

---

## 🚀 Key Highlights & Capabilities

- 🗺️ **Non-Stop 24/7 Google Maps Lead Scraper:** Scrapes business name, phone, email, website, ratings, total reviews, and address with auto-scroll and anti-detection delays.
- 💬 **WhatsApp Automation Engine:** High-deliverability messaging powered by Baileys with natural typing speed emulation, audio/voice notes, auto-read, and account safety protections.
- 📧 **Cold Email Outreach & Tracking:** Direct Gmail API dispatch via OAuth, Brevo API integration, and custom SMTP (cPanel, Hostinger, Zoho, Outlook). Includes a 1x1 transparent tracking pixel with 12-second machine prefetch protection.
- ⚡ **Multi-Channel Blast:** Simultaneous "WhatsApp + Email" campaigns targeting collected leads in a single click.
- 📊 **Executive Admin Dashboard:** Real-time metrics, subscriber management, plan assignments, transaction verification, and license key generation.
- 💳 **Built-in Monetization & Credits:** Pre-configured subscription tiers (Starter, Pro, Business, Lifetime) with per-lead credit deduction and local payment gateway support.

---

## 📁 Repository Structure

```text
ClientOutfy/
├── apps/
│   ├── chrome-extension/          # LeadOutfy Ai Pro Chrome Extension (Manifest V3)
│   ├── admin-dashboard/           # Web Management Dashboard (Deployable to Vercel)
│   ├── backend-api/               # Licensing & Tracking Serverless API (Vercel)
│   ├── email-server-brevo/        # Brevo API Cold Email Serverless Function (Vercel)
│   ├── email-server-smtp/         # Universal SMTP Express Server (Render / VPS)
│   └── whatsapp-server/           # WhatsApp Web Automation Server via Baileys (Render / VPS)
├── database/
│   ├── schema.sql                 # Complete Supabase PostgreSQL table definitions
│   ├── functions.sql              # Stored procedures & atomic credit deduction RPCs
│   ├── seed.sql                   # Default plans, admin credentials, and global settings
│   └── supabase_full_setup.sql    # One-click all-in-one database setup script
├── docs/
│   ├── COMPLETE_DEPLOY_GUIDE_BN.html # Original Bengali deployment guide
│   ├── DEPLOYMENT_GUIDE.md        # Comprehensive deployment manual
│   └── ARCHITECTURE.md            # System architecture and technical specifications
├── archives/                      # Original deployment packages and raw assets
└── README.md
```

---

## 🛠️ Quick Start & Installation

### 1. Database Setup
1. Create a project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor**, paste the contents of [`database/supabase_full_setup.sql`](./database/supabase_full_setup.sql), and click **RUN**.
3. Retrieve your **Project URL**, **anon key**, and **service_role key** from **Project Settings → API**.

### 2. Deploying Backend API to Vercel
1. Import this repository into [Vercel](https://vercel.com).
2. Set **Root Directory** to `apps/backend-api`.
3. Add Environment Variables:
   - `SUPABASE_URL`: Your Supabase URL
   - `SUPABASE_SERVICE_KEY`: Your Supabase service_role secret key
4. Deploy the project.

### 3. Deploying Admin Dashboard to Vercel
1. Update `SUPABASE_URL` and `SUPABASE_ANON_KEY` in [`apps/admin-dashboard/index.html`](./apps/admin-dashboard/index.html#L403-L404).
2. In Vercel, import this repository and set **Root Directory** to `apps/admin-dashboard`.
3. Deploy! Default credentials: `admin` / `admin123`.

### 4. Running the Chrome Extension
1. Open Google Chrome and go to `chrome://extensions/`.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select the folder `apps/chrome-extension`.
4. Open the extension, click **Account**, input your license key, and activate.

For in-depth deployment instructions for all servers, read the [Deployment Guide](./docs/DEPLOYMENT_GUIDE.md).

---

## 🛡️ License

This project is licensed under the [MIT License](LICENSE).
