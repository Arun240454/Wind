# WindSliter: LinkedIn Portfolio & ATS Resume Generator

WindSliter turns a job seeker's LinkedIn identity and career history into three things:

- a public portfolio page at `/u/<username>`
- an ATS-safe resume, as PDF and Word
- an editable cover letter

**Stack:** Next.js 15 (App Router) · TypeScript (strict) · Auth.js v5 (LinkedIn OIDC + email magic link) · PostgreSQL + Prisma · Tailwind CSS v4 · TipTap · `@react-pdf/renderer` · `docx` · Zod · Vitest · Playwright

## Run it locally in five commands

Prerequisites: Node 18.18 or later, and Docker Desktop running.

```bash
npm install
cp .env.example .env            # then set AUTH_SECRET (see below)
npm run db:up                   # Postgres 16 in Docker on :5432
npx prisma migrate deploy && npm run db:seed
npm run dev                     # http://localhost:3000
```

- **AUTH_SECRET:** generate one with `npx auth secret`, or use any random string of 32 or more characters.
- **Demo portfolio:** open <http://localhost:3000/u/demo>. You don't need to sign in to see it.
- **Signing in without email set up:** when no email service is configured, the magic link is printed in the dev server console. It's also written to `.dev-mail/last-link.txt`.

### Sending sign-in emails to real inboxes

Fill in one of these in `.env`, then restart `npm run dev`:

- **Gmail (SMTP), the quickest option.** It can send to any address.
  1. Turn on 2-Step Verification for the Google account.
  2. Create an App Password at <https://myaccount.google.com/apppasswords>.
  3. Set `EMAIL_SERVER_USER=you@gmail.com` and `EMAIL_SERVER_PASSWORD=<the 16-letter app password>`. `EMAIL_SERVER_HOST=smtp.gmail.com` and `EMAIL_SERVER_PORT=587` are already filled in.
- **Resend.** Set `RESEND_API_KEY`. Until you verify a domain in Resend, it only delivers to your own Resend account's address.
- **Trying the import:** `tests/fixtures/linkedin-profile.pdf` is a sample LinkedIn-style profile PDF. `npm run fixtures` regenerates it, along with a sample data export ZIP.

### Turning on "Sign in with LinkedIn"

1. Go to <https://www.linkedin.com/developers/apps> and click **Create app**. LinkedIn requires you to link a LinkedIn Page.
2. On the **Products** tab, add **Sign In with LinkedIn using OpenID Connect**.
3. On the **Auth** tab, add this authorized redirect URL: `http://localhost:3000/api/auth/callback/linkedin`.
4. Copy the Client ID and Client Secret into `.env` as `AUTH_LINKEDIN_ID` and `AUTH_LINKEDIN_SECRET`, then restart `npm run dev`.

The LinkedIn button stays hidden until both values are set.

## What LinkedIn's API allows, and why the import uses a file

LinkedIn's self-serve OpenID Connect product only shares **name, photo, email and locale**. Work history, education and skills are only available to LinkedIn partner apps, and scraping profile pages breaks LinkedIn's User Agreement.

So WindSliter imports a file the member downloads themselves. Two formats are accepted, detected from the file's first bytes:

| File | How to get it | What it includes |
| --- | --- | --- |
| **Profile PDF** (main option) | On your profile: **Resources** (or **More**) → **Save to PDF**. Available instantly. | Name, headline, location, summary, experience, education, top 3 skills, certifications |
| **Data export ZIP** | **Settings & Privacy → Data privacy → Get a copy of your data**. Emailed, usually within a day. | Everything above, plus all skills and projects |

The import works like this:

1. **Parse.** The file is read in memory and never written to disk. It must be 10 MB or smaller. A PDF can have at most 30 pages; a ZIP at most 200 entries and 5 MB per CSV.
2. **Map.** Both formats are mapped to one canonical profile.
   - The **PDF** is laid out text with no fields, so [linkedin-pdf.ts](src/lib/import/linkedin-pdf.ts) reads text positions and font sizes. It separates the sidebar from the main column, then recognizes the name (largest text), section headings, company and job-title lines (larger than body text) and date ranges. A company with several roles is handled too.
   - The **ZIP** maps `Profile.csv`, `Positions.csv`, `Education.csv`, `Skills.csv`, `Certifications.csv` and `Projects.csv`.
3. **Review.** The user sees a diff and confirms what to save. Nothing is saved before this step.
4. **Merge.** Records are matched by company, title and start date. A record the user created or edited by hand is **never overwritten**. Profile text is only filled in when the field is empty.

## Architecture

```
Browser ──► Next.js app (Vercel)
              ├─ pages + portfolio themes      src/app, src/components
              ├─ API route handlers + Auth.js  src/app/api, src/lib/api.ts, src/lib/auth.ts
              └─ core library (pure, tested)   src/lib/import, src/lib/resume, src/lib/cover-letter
                     │
                     ├─► LinkedIn OIDC   (consent screen only)
                     ├─► Resend          (magic links)
                     └─► PostgreSQL      (Prisma)
```

- **One document model.** `buildResumeDocument()` turns the profile and a resume's selections into a single `ResumeDocument`. The PDF renderer, the Word renderer and the live HTML preview all draw that same object, so the formats can't drift apart.
- **ATS rules, in one place:** a single column; standard headings in a fixed order; one date format (`Jan 2023 – Present`); contact details in the body, not a page header; standard fonts; plain bullets; and a real text layer in the PDF.
- **Cover letters** are stored as TipTap JSON, with merge fields such as `{{company}}`, `{{role}}`, `{{topSkill}}` and `{{recentRole}}`. Fields with no value become a visible `[Company]`, so a letter never goes out with blanks.
- **Security:**
  - Auth.js handles OAuth `state` and PKCE.
  - Sessions are stored in the database and use httpOnly cookies.
  - Every query is scoped by the session's user id.
  - All input is validated with Zod.
  - Import and export are rate-limited.
  - A Content-Security-Policy and other security headers are set in `next.config.ts`.
  - "Delete my account" cascades to all of the user's data.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| GET, POST | `/api/auth/[...nextauth]` | Auth.js: sign in, callback, sign out, session |
| GET, PATCH, DELETE | `/api/me` | Current user; set username or name; delete account |
| GET | `/api/me/export` | Download all of your data as JSON |
| GET, PATCH | `/api/profile` | Canonical profile; headline, summary, theme, visibility |
| POST | `/api/profile/import` | Upload the LinkedIn ZIP; returns a preview diff and saves nothing |
| POST | `/api/profile/import/confirm` | Apply the records the user selected |
| GET, POST | `/api/profile/:type` | List or create `experience`, `education`, `skills`, `certifications` or `projects` |
| PATCH, DELETE | `/api/profile/:type/:id` | Edit (marks the record hand-edited) or delete |
| PATCH | `/api/profile/reorder` | Save the order of a record list |
| GET | `/api/portfolio/:username` | Public portfolio data (published profiles only) |
| GET, POST | `/api/resumes` | List or create resume versions |
| GET, PATCH, DELETE | `/api/resumes/:id` | Read, update or delete a version; returns the built document |
| GET | `/api/resumes/:id/export?format=pdf\|docx` | Stream the generated file |
| GET, POST | `/api/cover-letters` | List, or create from a template |
| GET, PATCH, DELETE | `/api/cover-letters/:id` | Read, update or delete a letter |
| GET | `/api/cover-letters/:id/export?format=pdf\|docx` | Stream the filled letter |
| GET | `/api/templates/cover-letters` | Starter templates and merge fields |

All errors use one shape: `{ "error": { "code": "VALIDATION_FAILED", "message": "...", "fields": { ... } } }`.

## Tests

```bash
npm test            # Vitest: dates, CSV mapping, merge rules, resume builder, merge fields, PDF/DOCX golden tests
npm run test:e2e    # Playwright: email sign-in → onboarding → import → publish → download → cover letter
npm run typecheck
```

- **Golden tests.** These render a resume to PDF and to DOCX, extract the text the way an ATS would, and check that every heading and bullet is present and in order.
- **End-to-end test.** This starts its own server on port 3100, with emails going to the console only, so it never sends real mail and can run alongside `npm run dev`. It uploads the sample profile PDF and reads the magic link from `.dev-mail/last-link.txt`. Run Playwright's browser installer once first: `npx playwright install chromium`.

## Deploying (Vercel + Neon)

1. Create a Neon Postgres database. Set `DATABASE_URL` in Vercel.
2. Set these in Vercel:
   - `AUTH_SECRET`
   - `AUTH_URL=https://<your-domain>`
   - `AUTH_LINKEDIN_ID`
   - `AUTH_LINKEDIN_SECRET`
   - `RESEND_API_KEY`
   - `EMAIL_FROM` (an address on a domain you've verified in Resend)
3. Add `https://<your-domain>/api/auth/callback/linkedin` to the LinkedIn app's redirect URLs.
4. Set the build command to `npx prisma migrate deploy && npm run build`. Run `npm run db:seed` once to create `/u/demo`.

Production refuses to sign anyone in by email unless Resend or SMTP is configured. The in-memory rate limiter is per instance, so for multi-instance deploys, swap it for Upstash Redis.

## Project layout

```
prisma/                 schema, migrations, demo seed
src/app/                pages: (marketing), (auth), (app)/…, u/[username], api/…
src/components/         UI by feature: profile, portfolio, resume, cover-letter
src/lib/                auth, db, validation, import/, resume/, cover-letter/
tests/unit/             Vitest
tests/e2e/              Playwright
tests/fixtures/         anonymized LinkedIn export CSVs
prototype-express/      the original Express LinkedIn-OIDC prototype
```

## Roadmap

These are phase 3 items from the spec:

- a job-description keyword-match helper
- portfolio view analytics
