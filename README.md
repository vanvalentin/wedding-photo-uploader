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
       │  PUT chunks (resumable)                      │ Service account
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
| `GOOGLE_DRIVE_FOLDER_ID` | Yes | Folder ID inside your **Shared Drive** |
| `GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL` | Yes | Service account email from JSON key |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | Yes | Service account PEM private key |
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

> **Google Drive:** This app uses a **service account** with a Google Workspace **Shared Drive**. Personal Gmail / My Drive is not supported.

## Google Cloud Setup (Service Account + Shared Drive)

### 1. Create a Google Cloud project

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (or select an existing one).

### 2. Enable the Google Drive API

1. **APIs & Services → Library**
2. Search **Google Drive API** → **Enable**

No OAuth consent screen or OAuth client is required.

### 3. Create a service account

1. **APIs & Services → Credentials → Create credentials → Service account**
2. Name it (e.g. `wedding-uploader`) → **Create and continue** → **Done**
3. Open the service account → **Keys** → **Add key → Create new key → JSON**
4. From the downloaded JSON:
   - `client_email` → `GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL`
   - `private_key` → `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`

### 4. Set up the Shared Drive folder

1. In Google Drive, open your **Shared drive** (Workspace — not My Drive)
2. Create a folder for guest uploads (e.g. `Wedding Guest Photos`)
3. Copy the folder ID from the URL → `GOOGLE_DRIVE_FOLDER_ID`
4. **Manage members** on the **Shared drive** (top level)
5. Add the service account email as **Content manager**

The folder must live inside the Shared Drive. Sharing a personal Drive folder with the service account will not work.

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
| `GOOGLE_DRIVE_FOLDER_ID` | Shared Drive folder ID |
| `GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL` | Service account email |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | Service account private key |

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

1. Confirm the folder is inside a **Shared Drive** (not My Drive)
2. Add the service account as **Content manager** on the Shared drive itself
3. Confirm `GOOGLE_DRIVE_FOLDER_ID` matches that folder

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

Thumbnails and full-size previews are proxied through `/api/media/thumbnail` and `/api/media/view` using the service account.

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
