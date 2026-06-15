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
┌─────────────┐     POST /api/upload/init      ┌─────────────┐
│   Browser   │ ─────────────────────────────► │   Express   │
│  (React)    │ ◄── session URI + metadata ─── │   Backend   │
└──────┬──────┘                                └──────┬──────┘
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
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | Service account private key (PEM format). Use `\n` for newlines when setting inline |
| `PORT` | Server port (default: `3001`) |
| `NODE_ENV` | `development` or `production` |
| `CORS_ORIGIN` | Allowed frontend origin(s), comma-separated (default: `http://localhost:5173`) |
| `VITE_API_URL` | Backend URL for the Vite client (default: empty — uses Vite proxy in dev) |

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

## Production Build

```bash
npm run build
NODE_ENV=production npm start
```

In production, the Express server serves the built React app from `client/dist` and handles API routes.

Set `CORS_ORIGIN` to your production domain if frontend and backend are hosted separately.

## Project Structure

```
├── client/                 # Vite + React frontend
│   └── src/
│       ├── components/     # UI components
│       ├── hooks/          # Upload queue & beforeunload guard
│       ├── i18n/           # EN/FR translations
│       └── services/       # Resumable upload client
├── server/                 # Express backend
│   └── src/
│       ├── routes/         # API routes
│       └── services/       # Google Drive integration
├── .env.example
└── package.json
```

## License

MIT
