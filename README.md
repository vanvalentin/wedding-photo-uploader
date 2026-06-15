# Wedding Media Uploader

A premium, mobile-first web application that lets wedding guests upload photos and videos directly to your Google Drive — no login required.

Guests can optionally identify themselves, preview their media in a queue, and upload large files reliably via Google Drive's **Resumable Upload** API (chunked uploads sent directly from the browser to Google).

## Features

- **Anonymous uploads** — no authentication for guests
- **Google Drive destination** — all media lands in your folder via a service account
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
       │  PUT chunks (resumable)                      │ Service Account
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

Copy `.env.example` to `.env` in the project root (or set these in your hosting provider):

| Variable | Description |
|---|---|
| `GOOGLE_DRIVE_FOLDER_ID` | ID of the Google Drive folder where uploads are stored. Found in the folder URL: `https://drive.google.com/drive/folders/<FOLDER_ID>` |
| `GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL` | Service account email from Google Cloud Console |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | Service account private key (PEM format). Use `\n` for newlines in `.env`; on Vercel you can paste the full multiline key |
| `PORT` | Server port for local Express only (default: `3001`) |
| `NODE_ENV` | `development` or `production` |
| `CORS_ORIGIN` | Allowed frontend origin(s) for local Express only (default: `http://localhost:5173`) |
| `VITE_API_URL` | Backend URL for local Vite dev only (leave **empty** on Vercel — same-origin `/api`) |

## Google Cloud Setup

### 1. Create a Google Cloud project

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (or select an existing one).

### 2. Enable the Google Drive API

1. Navigate to **APIs & Services → Library**.
2. Search for **Google Drive API** and enable it.

### 3. Create a service account

1. Go to **APIs & Services → Credentials**.
2. Click **Create Credentials → Service account**.
3. Give it a name (e.g. `wedding-uploader`).
4. Skip optional role grants → **Done**.
5. Click the new service account → **Keys → Add Key → Create new key → JSON**.
6. From the downloaded JSON, copy:
   - `client_email` → `GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL`
   - `private_key` → `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`

### 4. Share your Drive folder with the service account

1. Open your target Google Drive folder.
2. Click **Share**.
3. Add the service account email (`...@....iam.gserviceaccount.com`) as **Editor**.
4. Copy the folder ID from the URL → `GOOGLE_DRIVE_FOLDER_ID`.

> **Important:** The service account must have Editor access to the folder, or uploads will fail with a 403 error.

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
| `GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL` | `client_email` from the JSON key |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | `private_key` from the JSON key (paste the full PEM, including `-----BEGIN PRIVATE KEY-----`) |

> **Do not set `VITE_API_URL` on Vercel.** The frontend and API share the same domain, so requests go to `/api/upload/init` automatically.

> **Private key tip:** In the Vercel dashboard, paste the entire private key with real line breaks. You do not need to escape `\n` like in a local `.env` file.

Apply variables to **Production**, **Preview**, and **Development**.

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
