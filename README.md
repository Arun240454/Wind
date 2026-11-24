# WindSliter

Upload a LinkedIn profile or resume and get an AI-written **career summary** and **cover letter**, ready to download as PDF or Word. No account, no database: the file is read in memory, sent to Claude, and nothing is stored.

## Run it

Needs Node 22+ and a Claude API key.

```bash
npm install
cp .env.example .env      # then set ANTHROPIC_API_KEY
npm run dev               # http://localhost:3000
```

Get a key at https://platform.claude.com/settings/keys.

## What you can upload

| File | Where it comes from |
|---|---|
| PDF | LinkedIn profile → **More → Save to PDF**, or any resume PDF |
| Word (.docx) | Any resume |
| ZIP | LinkedIn → Settings → Data privacy → **Get a copy of your data**. Only the career CSVs are read (Profile, Positions, Education, Skills, Certifications…). Messages and connections are ignored. |
| .txt / .md | Plain-text resume |

Limit: 10 MB per file. You can also give a company, role and job description to tailor the cover letter.

## API

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/api/generate` | multipart: `file`, optional `company`, `role`, `jobDescription` | JSON result (candidate, summary, coverLetter) |
| POST | `/api/download` | JSON: `{ kind: "summary" \| "cover-letter", format: "pdf" \| "docx", result }` | The file |

Errors are always `{ error: { code, message } }`. Both routes are rate-limited per IP (in memory, per instance).

## Scripts

```bash
npm run dev         # dev server
npm run build       # production build
npm start           # serve the build
npm run typecheck
npm test            # Vitest unit tests (no API key needed)
```

## Deploy

Any Node host works (Vercel, Render, a VM). Set `ANTHROPIC_API_KEY` in the host's environment. Generation takes 20–60 seconds, so allow at least 120 s for the request (`maxDuration` is set on the route for Vercel).
