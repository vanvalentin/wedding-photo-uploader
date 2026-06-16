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
- **Upload success summary** — photo/video counts and a thumbnail grid with load-more
- **Curated highlights gallery** — host-picked favourites from Google Drive via Supabase (optional)
- **Upload registry** — successful guest uploads are registered in Supabase automatically
- **Admin curation UI** — browse all uploads and add/remove highlights at `/admin`

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
| `SUPABASE_URL` | Supabase | Project URL (Settings → API) |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase | **Publishable** key (public, safe for client) |
| `SUPABASE_SECRET_KEY` | Server only | **Secret** key (`sb_secret_...`) — upload registry, admin writes |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Optional | Same publishable key if needed client-side |
| `ADMIN_SECRET` | Admin UI | Password for `/admin` gallery curation |

> **Supabase keys** (Settings → API → **Publishable and secret API keys**):
> - **Publishable** (`sb_publishable_...`) → `SUPABASE_PUBLISHABLE_KEY` — public, used with RLS
> - **Secret** (`sb_secret_...`) → `SUPABASE_SECRET_KEY` — server only, never in the browser
>
> Legacy **anon** / **service_role** JWT keys still work as fallbacks but Supabase recommends publishable + secret.

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
4. On **Scopes**, add:
   - `https://www.googleapis.com/auth/drive.file` (guest uploads)
   - `https://www.googleapis.com/auth/drive.readonly` (one-time import of existing folder photos)
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
- Only the small `/api/upload/init` and `/api/upload/complete` calls hit your server — large file bytes go directly to Google Drive
- Supabase is optional but recommended for upload registry, highlights, and admin curation

## Curated Highlights Gallery (optional)

The home screen can show a **Highlights** section — a host-curated grid of favourite photos/videos from Google Drive, powered by Supabase.

### Setup

1. Create a Supabase project (or use an existing one).
2. Run migrations in `supabase/migrations/` (`curated_gallery` + `media_uploads`).
3. Add to `.env` / Vercel:
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SECRET_KEY` (server only — never expose client-side)
   - `ADMIN_SECRET` (for `/admin`)
4. Guest uploads are registered automatically via `POST /api/upload/complete` after each successful Drive upload.

### One-time import (existing Drive photos)

Photos already in your Drive folder **before** deploying the registry are not registered automatically. Import them once:

**Option A — Admin UI (recommended)**

1. Open `/admin` and sign in.
2. Click **Import from Drive** (top right).
3. Existing photos/videos in `GOOGLE_DRIVE_FOLDER_ID` appear under **All uploads** — add favourites to **Highlights**.

**Option B — CLI**

```bash
npm run import-drive
```

**If import fails with 403 / insufficient permissions**

Your OAuth token may only have `drive.file`. Re-authorize with read access:

1. In Google Cloud Console → OAuth consent screen → Scopes, add `drive.readonly`.
2. Revoke the app at [Google Account permissions](https://myaccount.google.com/permissions).
3. Run `npm run get-refresh-token` and update `GOOGLE_OAUTH_REFRESH_TOKEN` in Vercel / `.env`.

Safe to run import multiple times — already-registered files are skipped.

### Admin UI (`/admin`)

1. Open `/admin` on your deployed site (or `http://localhost:5173/admin` in dev).
2. Sign in with your `ADMIN_SECRET`.
3. **All uploads** — registered photos/videos. Use **Import from Drive** for pre-existing folder files.
4. **Highlights** — curated gallery shown to guests. Click **Remove** to un-feature.

You can still insert rows manually in Supabase if needed, but the admin UI is the recommended workflow.

### Manual SQL (alternative)

Insert rows into `curated_gallery`:

| Column | Description |
|---|---|
| `drive_file_id` | Google Drive file ID (from the file URL or folder listing) |
| `caption` | Optional caption shown in the lightbox |
| `sort_order` | Lower numbers appear first |
| `is_video` | `true` for videos |
| `taken_at` | Optional capture date for sorting |

Thumbnails and full-size previews are proxied through `/api/media/thumbnail` and `/api/media/view` using your Google OAuth credentials.

If Supabase is not configured or the highlights table is empty, the Highlights section is hidden automatically.

## Production Build (self-hosted alternative)

```bash
npm run build
npm start
```

The Express server runs via `tsx` and serves the built React app from `client/dist` when `NODE_ENV=production`.

## Project Structure

```
├── api/                    # Vercel serverless functions
│   ├── upload/
│   │   ├── init.ts         # POST — start resumable upload session
│   │   ├── complete.ts     # POST — register upload in Supabase
│   │   └── health.ts       # GET — health check
│   ├── admin/
│   │   ├── uploads.ts      # GET — list registered uploads (admin)
│   │   ├── curated.ts      # GET/POST/DELETE — manage highlights (admin)
│   │   └── import-drive.ts # POST — one-time import from Drive folder
│   ├── gallery/
│   │   └── curated.ts      # GET — curated highlights from Supabase
│   └── media/
│       ├── thumbnail.ts    # GET — proxy Drive thumbnail
│       └── view.ts         # GET — proxy full media for lightbox
├── lib/                    # Shared backend logic (Vercel + Express)
│   ├── adminAuth.ts
│   ├── adminGallery.ts
│   ├── config.ts
│   ├── driveImport.ts
│   ├── gallery.ts
│   ├── googleDrive.ts
│   ├── mediaUploads.ts
│   ├── supabase.ts
│   ├── uploadComplete.ts
│   └── uploadInit.ts
├── supabase/migrations/    # Supabase schema
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
