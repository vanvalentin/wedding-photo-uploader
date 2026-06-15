# Wedding Media Uploader

A premium, mobile-first web application that lets wedding guests upload photos and videos directly to your Google Drive — no login required.

Guests can optionally identify themselves, preview their media in a queue, and upload large files reliably via Google Drive's **Resumable Upload** API (chunked uploads sent directly from the browser to Google).

## Features

- **Anonymous uploads** — no authentication for guests
- **Google Drive destination** — all media lands in your folder using your Google storage
- **Resumable chunked uploads** — bypasses size limits; frontend chunks files and uploads directly to the session URI
- **Bilingual UI** — English & French with a native EN / FR toggle
- **Optional guest name** — appended to filenames and Drive metadata
- **Media queue** — multi-file selection with photo/video preview thumbnails
- **Lightbox** — full-screen preview on thumbnail tap
- **Per-file progress bars** — animated progress as chunks upload
- **Exit guard** — browser warning if leaving during active or unsent uploads

## Architecture

```
┌─────────────┐     POST /api/upload/init      ┌──────────────────┐
│   Browser   │ ─────────────────────────────► │  API (Express or │
│  (React)    │ ◄── session URI + metadata ─── │  Vercel serverless)│
└──────┬──────┘                                └────────┬─────────┘
       │                                              │
       │  PUT chunks (resumable)                      │ OAuth (your Drive)
       ▼                                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Google Drive API                          │
│              (target folder: GOOGLE_DRIVE_FOLDER_ID)         │
└─────────────────────────────────────────────────────────────┘
```

1. The backend initiates a resumable upload session using the Google Drive API and returns the **session URI**.
2. The frontend splits each file into 8 MB chunks and `PUT`s them directly to Google — file bytes never pass through your server.
3. Optional guest names are prefixed to filenames (e.g. `Marie_photo.jpg`) and stored in Drive file descriptions.

## Required Environment Variables

Copy `.env.example` to `.env` in the project root (or set these in Vercel):

| Variable | Required | Description |
|---|---|---|
| `GOOGLE_DRIVE_FOLDER_ID` | Yes | Folder ID from `https://drive.google.com/drive/folders/<ID>` |
| `GOOGLE_OAUTH_CLIENT_ID` | Yes* | OAuth client ID (Desktop app type) |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Yes* | OAuth client secret |
| `GOOGLE_OAUTH_REFRESH_TOKEN` | Yes* | One-time refresh token for the account that **owns** the folder |
| `GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL` | Shared Drive only | Service account email — **not for personal Gmail** |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | Shared Drive only | Service account PEM key |
| `PORT` | No | Local Express port (default: `3001`) |
| `CORS_ORIGIN` | No | Local dev CORS (default: `http://localhost:5173`) |
| `VITE_API_URL` | No | Leave **empty** on Vercel |

\* Use OAuth for **personal Google Drive** (Gmail). This is the recommended setup.

> **Why not a service account?** Google service accounts have **zero storage quota** on personal Drive. Sharing a folder with a service account does not help — uploads fail with `403 storageQuotaExceeded`. Service accounts only work with [Google Workspace Shared Drives](https://developers.google.com/workspace/drive/api/guides/about-shareddrives).

## Google Cloud Setup (OAuth — personal Drive)

### 1. Create a Google Cloud project

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (or select an existing one).

### 2. Enable the Google Drive API

1. **APIs & Services → Library**
2. Search **Google Drive API** → **Enable**

### 3. Configure OAuth consent screen

1. **APIs & Services → OAuth consent screen**
2. Choose **External** (or Internal if Workspace)
3. Fill in app name & support email → **Save**
4. On **Scopes**, add: `https://www.googleapis.com/auth/drive.file`
5. On **Test users**, add your Google account (while app is in Testing mode)

### 4. Create OAuth credentials

1. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
2. Application type: **Desktop app**
3. Copy **Client ID** → `GOOGLE_OAUTH_CLIENT_ID`
4. Copy **Client secret** → `GOOGLE_OAUTH_CLIENT_SECRET`

### 5. Get a refresh token (one-time)

From the project root, with client ID/secret in `.env`:

```bash
npm install
npm run get-refresh-token
```

1. Open the URL printed in the terminal
2. Sign in with the Google account that **owns** your wedding Drive folder
3. Approve access
4. Copy the `code` from the redirect URL (localhost may show an error — that's OK)
5. Paste the code → copy the `GOOGLE_OAUTH_REFRESH_TOKEN` output

### 6. Set your folder ID

1. Create a folder in Google Drive for wedding uploads
2. Copy the ID from the URL → `GOOGLE_DRIVE_FOLDER_ID`

No need to share the folder with anyone — uploads use **your** account's storage.

## Google Cloud Setup (Service Account — Shared Drives only)

Use this only if you have **Google Workspace** and a **Shared Drive** (not personal My Drive).

1. Enable Google Drive API (steps above)
2. Create a service account + JSON key
3. Add the service account as **Content manager** on the Shared Drive
4. Set `GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL` and `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
5. Use a folder ID **inside the Shared Drive**
6. Do **not** set OAuth variables

## Local Development

```bash
# Install dependencies
npm install
npm run install:all

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Start dev servers (Express on :3001, Vite on :5173)
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Local dev with Vercel runtime (optional)

To test the same serverless API routes Vercel uses in production:

```bash
npm install
cp .env.example .env.local   # Vercel CLI reads .env.local
npm run dev:vercel
```

## Deploy to Vercel (recommended)

The repo is configured for one-click Vercel deployment: the React app is served as static files and `/api/*` routes run as serverless functions.

### 1. Push to GitHub

Make sure your code is in a GitHub repository.

### 2. Import the project in Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. **Framework Preset:** Other (leave as detected from `vercel.json`)
4. **Root Directory:** `.` (repository root — do not set to `client`)
5. Build settings are read from `vercel.json` automatically

### 3. Add environment variables

In **Project → Settings → Environment Variables**, add:

| Variable | Value |
|---|---|
| `GOOGLE_DRIVE_FOLDER_ID` | Your Drive folder ID |
| `GOOGLE_OAUTH_CLIENT_ID` | OAuth Desktop app client ID |
| `GOOGLE_OAUTH_CLIENT_SECRET` | OAuth client secret |
| `GOOGLE_OAUTH_REFRESH_TOKEN` | From `npm run get-refresh-token` |

Remove any `GOOGLE_SERVICE_ACCOUNT_*` variables if you were using them — they do not work with personal Drive.

> **Do not set `VITE_API_URL` on Vercel.** The frontend and API share the same domain, so requests go to `/api/upload/init` automatically.

Apply variables to **Production**, **Preview**, and **Development**, then **redeploy**.

### 4. Deploy

Click **Deploy**. Vercel will:

1. Install root + client dependencies
2. Build the Vite app to `client/dist`
3. Deploy serverless functions from `api/`

Your app will be live at `https://your-project.vercel.app`.

### 5. Verify

1. Open your Vercel URL
2. Upload a small test photo
3. Confirm it appears in your Google Drive folder

Health check: `GET https://your-project.vercel.app/api/upload/health`

### Vercel free tier notes

- Serverless functions are included on the free Hobby plan (sufficient for a wedding weekend)
- Only the small `/api/upload/init` call hits your server — large file bytes go directly to Google Drive
- No database or persistent server required

## Production Build (self-hosted alternative)

```bash
npm run build
npm start
```

The Express server runs via `tsx` and serves the built React app from `client/dist` when `NODE_ENV=production`.

## Project Structure

```
├── api/                    # Vercel serverless functions
│   └── upload/
│       ├── init.ts         # POST — start resumable upload session
│       └── health.ts       # GET — health check
├── lib/                    # Shared backend logic (Vercel + Express)
│   ├── config.ts
│   ├── googleDrive.ts
│   └── uploadInit.ts
├── client/                 # Vite + React frontend
│   └── src/
│       ├── components/     # UI components
│       ├── hooks/          # Upload queue & beforeunload guard
│       ├── i18n/           # EN/FR translations
│       └── services/       # Resumable upload client
├── server/                 # Express backend (local dev / self-hosted)
│   └── src/
│       └── routes/         # API routes
├── vercel.json             # Vercel build & routing config
├── .env.example
└── package.json
```

## License

MIT
