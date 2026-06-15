# AGENTS.md

## Cursor Cloud specific instructions

Wedding Media Uploader: a mobile-first React app for guests to upload photos/videos
straight to Google Drive via resumable uploads. Two local services:

- **Client** — Vite + React dev server on port `5173` (`npm run dev --prefix client`).
- **Server** — Express (run via `tsx watch`) on port `3001` (`npm run dev --prefix server`).
  Vite proxies `/api/*` to the Express server (see `client/vite.config.ts`).

Standard commands (see `package.json` / `client/package.json` / `server/package.json`):

- Run both dev servers: `npm run dev` (root).
- Typecheck/build: `npm run build` (client: `tsc --noEmit && vite build`),
  `npm run build --prefix server` (server: `tsc --noEmit`). There is no separate lint step.
- Health check: `GET http://localhost:3001/api/upload/health` (or via proxy on `:5173`).

### Required environment variables (non-obvious startup gotcha)

The Express server validates Google credentials at module-eval time in `lib/config.ts`
(`GOOGLE_DRIVE_FOLDER_ID`, `GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL`,
`GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`); a missing one throws immediately and the server exits.

Because of ESM import ordering in `server/src/index.ts`, `config.js` is evaluated *before*
the `dotenv.config()` body statement runs. As a result these variables must already be present
in the **process environment** when the server starts — loading them only from `.env` via dotenv
is too late.

- If the three Google variables are provided as Cursor **Secrets**, they are injected into the
  VM environment automatically and `npm run dev` works as-is (and real Drive uploads succeed).
- Without secrets, create a local `.env` (gitignored) and source it before starting, e.g.
  `set -a && . ./.env && set +a && npm run dev`. A dummy RSA key
  (`openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048`, newlines escaped as `\n`)
  is enough to boot the server; the full request flow runs end-to-end and the Google auth call
  returns `invalid_grant` until real credentials are supplied.

The Vercel serverless functions in `api/` read the same variables straight from `process.env`
(no dotenv); `npm run dev:vercel` uses the Vercel CLI and `.env.local`.
