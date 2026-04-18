# ServX

**ServX** is an open-source infrastructure command center that gives developers a unified dashboard to manage servers, databases, deployments, security controls, and third-party integrations. Built with React, TypeScript, Vite, and Node.js.

---

## Features

### Dashboard & Exposure Command Center
- **Exposure Command Center** – Central view of data sources and exposure metrics
- **Flow Visualization** – Visual representation of data flows and connections
- **Metric Cards** – Key metrics and health indicators at a glance

### Auto-Medic Pipeline
- **Incident Pipeline** – Live incident tracking with severity levels (e.g., SEV-1)
- **Error Detection** – Monitors frontend errors, build failures, and DB timeouts from Vercel and Render
- **AI-Generated Fixes** – Auto-generated pull requests for detected issues
- **Deployment Integration** – Connects to Vercel and Render for deployment visibility

### Global Operations
- **Kill Switches & Feature Flags**
  - Global Maintenance Mode – Block all non-admin traffic instantly
  - Feature toggles (Image Uploads, AI Features, New Signups)
  - Per-project selection (Vercel/Render projects)
- **FinOps** – Cost tracking, projected spend, and threshold alerts
- **Remote Task Executor**
  - Force DB Backup
  - Clear Redis Cache
  - Sync GitHub Stats
- **API Security Radar** – Monitor API IPs, request counts, and ban/allow status
- **Ghost Mode** – Admin-only user impersonation for support

### Databases
- **Universal Database Controller** – Manage data from multiple sources
- **Supported Sources** – Firebase, MongoDB, Supabase, MySQL, PostgreSQL, AWS RDS, Oracle, MariaDB, Google Sheets
- **Data Grid** – View, search, and filter records across collections
- **Quick View Drawer** – Inspect record details
- **File Upload** – Import data (e.g., CSV, Google Sheets)
- **Firebase User Manager** – Manage Firebase Auth users

### Hosting & Servers
- **Multi-Provider Support** – Vercel, Render, Railway, DigitalOcean, Fly.io, AWS
- **Deployment Management** – View services, deployments, and status
- **Connection Vault** – Encrypted storage of API keys and tokens
- **Per-User Isolation** – Credentials stored and used only for your account

### GitHub Integration
- **Repository Analytics** – Commits, pull requests, contributors, languages
- **GitHub Calendar** – Contribution heatmap
- **Repository Access Management** – Manage collaborator roles (owner-only)
- **Stack Analysis** – Technology stack per repository

### Attack Paths
- **3D Visualization** – Solar system–style view of repositories and vulnerabilities
- **Vulnerability Scanning** – DDoS, injection, and other attack vectors
- **Scan Phases** – Idle, scanning, attacking, reporting
- **Repository Mapping** – Visual representation of repo relationships

### Emails
- **Gmail Integration** – Connect via Google OAuth
- **Inbox View** – Read emails from your connected Gmail account
- **System Alerts** – Send automated alerts via Gmail (gmail.send scope)

### Administration
- **Admin Permission Matrix** – Role-based access (owner, editor, viewer)
- **Invite Administrators** – Add team members with specific roles
- **Workspace Management** – Configure workspace settings

### Authentication & Security
- **Supabase Auth** – Sign in with Email, Google, or GitHub
- **GitHub Bridge** – Link GitHub account for users who sign in with Google
- **Encrypted Credentials** – API keys encrypted at rest
- **Require Auth** – Protected routes with Supabase access token verification

### New User Pipeline
- **Google Sheets Logging** – New user signups logged to a configurable spreadsheet
- **Welcome Email** – Automated welcome email via Gmail API

---

## Tech Stack

### Frontend
- **React 18** + **TypeScript**
- **Vite** – Build tool
- **Tailwind CSS** – Styling
- **Radix UI** – Accessible components
- **Framer Motion** – Animations
- **React Router v6** – Routing
- **TanStack Query** – Data fetching
- **Recharts** – Charts and visualizations
- **Three.js / React Three Fiber** – 3D graphics (Attack Paths)
- **Supabase** – Authentication

### Backend
- **Node.js** + **Express 5**
- **MongoDB** + **Mongoose**
- **Supabase Admin** – Access token verification
- **Google APIs** – Gmail, Sheets
- **google-spreadsheet** – Sheets API wrapper

---

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB
- Supabase project
- (Optional) Firebase project for Firebase User Manager workflows
- (Optional) Google Cloud project for Gmail/Sheets

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd ServX

# Install all workspace dependencies
npm install
```

### Environment Variables

**Frontend** (`apps/web/.env`):
```
VITE_API_BASE_URL=http://localhost:5000
VITE_API_URL=http://localhost:5000
```

**Backend** (`apps/api/.env`):
```
NODE_ENV=development
PORT=5000
MONGODB_URI=your_mongodb_uri
FRONTEND_URL=http://localhost:5173
ENCRYPTION_KEY=32_character_hex_key
FIREBASE_PROJECT_ID=your_project_id
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Google OAuth (Gmail)
VERCEL_CLIENT_ID=
VERCEL_CLIENT_SECRET=
refresh_token=
access_token=

# Google Sheets (New User Logging)
SPREADSHEET_ID=
GOOGLE_SHEETS_CLIENT_EMAIL=
GOOGLE_SHEETS_PRIVATE_KEY=
```

### Running Locally

```bash
# Start API + Web together
npm run dev

# Optional: start worker too
npm run dev:full
```

Frontend: http://localhost:5173  
Backend: http://localhost:5000

---

## Project Structure

```
ServX/
├── apps/
│   ├── web/           # React + Vite frontend
│   │   └── src/
│   ├── api/           # Express API
│   │   ├── src/
│   │   ├── models/
│   │   └── services/
│   └── worker/        # Background jobs
├── packages/          # Shared package modules
├── supabase/          # Supabase edge/functions assets
└── package.json       # Workspace scripts
```

---

## Routes

| Path | Description |
|------|-------------|
| `/` | Landing page |
| `/auth` | Sign in / Create account |
| `/privacy` | Privacy Policy |
| `/terms` | Terms of Service |
| `/dashboard` | Exposure Command Center |
| `/auto-medic` | Auto-Medic Incident Pipeline |
| `/operations` | Global Operations (Kill Switches, FinOps, Remote Tasks) |
| `/databases` | Universal Database Controller |
| `/hosting/:providerId` | Hosting Integration (Vercel, Render, etc.) |
| `/github` | GitHub Analytics & Access |
| `/attack-paths` | Attack Path Visualization |
| `/emails` | Gmail Inbox |
| `/admin` | Administration |
| `/bridge` | Link GitHub (for Google sign-in users) |
| `/settings/connections` | Infra Settings & Connections |

---

## API Overview

- `POST /api/auth/sync` – Sync user profile after authentication
- `GET /api/auth/github/url` – GitHub OAuth URL
- `GET /api/auth/github/callback` – GitHub OAuth callback
- `GET /api/github/repos` – List repositories
- `GET /api/github/repos/:owner/:name/details` – Repository details
- `POST /api/github/collaborator/role` – Update collaborator role
- `GET /api/connections` – List saved connections
- `POST /api/connections` – Save connection (encrypted)
- `GET /api/connections/hosting/:provider/status` – Hosting provider status
- `POST /api/operations/toggle-maintenance` – Toggle maintenance mode
- `GET /api/gmail/status` – Gmail connection status
- `GET /api/gmail/inbox` – Fetch inbox

---

## License

Open source. See repository for license details.

---

## Contact

servx.lab@gmail.com
