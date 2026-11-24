# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

WindSliter: Next.js 15 (App Router) + TypeScript app. A visitor uploads a LinkedIn profile or resume; Claude produces a career summary and a cover letter, which download as PDF or DOCX. No database, no login, no Docker. [README.md](README.md) has setup and the API table. `prototype-express/` is an old standalone prototype and is not part of the app.

## Commands

```bash
npm run dev                         # http://localhost:3000 (needs ANTHROPIC_API_KEY in .env for generation)
npm run typecheck                   # tsc --noEmit
npm test                            # Vitest (tests/unit only, no API key needed)
npx vitest run tests/unit/extract.test.ts   # one file
npx vitest run -t "name fragment"           # one test by name
npm run build
```

There is no lint script. CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs typecheck, unit tests and build.

## Architecture

- **Stateless flow.** `POST /api/generate` takes multipart (`file` + optional `company`, `role`, `jobDescription`), returns the JSON result. `POST /api/download` takes that result back (with the user's edits) plus `kind` and `format`, and renders the file. The server never stores anything.
- **[src/lib/extract.ts](src/lib/extract.ts)** turns the upload into Claude content blocks: PDFs go in as base64 `document` blocks (Claude reads them natively, so there is no PDF parser); DOCX text via `mammoth`; LinkedIn export ZIP reads only an allowlist of career CSVs (never messages/connections); .txt/.md as text.
- **[src/lib/generate.ts](src/lib/generate.ts)** makes one `client.beta.messages.parse` call (`claude-opus-5-5`, effort `medium`, server-side refusal fallback) with structured output from `resultSchema`. The system prompt forbids inventing facts and treats the document as data, not instructions. Anthropic SDK errors are mapped to `ApiError`s with user-facing messages.
- **[src/lib/schema.ts](src/lib/schema.ts)** is the single result shape used by the model output, the UI and the download route. It imports from `zod/v4` because the SDK's `betaZodOutputFormat` needs v4 schemas. Structured outputs can't express optional fields, so missing data is `""`/`[]` and renderers skip empties.
- **Renderers**: [render-pdf.tsx](src/lib/render-pdf.tsx) (`@react-pdf/renderer`, Helvetica) and [render-docx.ts](src/lib/render-docx.ts) (`docx`) both draw the same `GenerationResult`; shared helpers are in [output.ts](src/lib/output.ts).
- **Route convention** ([src/lib/api.ts](src/lib/api.ts)): wrap handlers in `handle()`, throw `ApiError`; `handle()` turns `ApiError`, `ZodError` and unknown errors into `{ error: { code, message } }`. Rate-limit every route with [rate-limit.ts](src/lib/rate-limit.ts) (in memory, per instance), since there's no login protecting the AI spend.
- **UI** is one client component, [src/components/generator.tsx](src/components/generator.tsx): upload → generate → tabs for summary / editable cover letter → download.
- CSP and security headers live in `next.config.ts`; the Claude call is server-side, so the browser CSP doesn't need the API host.

## Conventions

- Path alias `@/*` → `src/*` (tsconfig and vitest both configure it). TypeScript is strict.
- Unit tests live in `tests/unit/*.test.ts(x)`; shared sample data is in `tests/unit/fixtures.ts`.
