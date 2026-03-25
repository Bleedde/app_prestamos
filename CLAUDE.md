# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"Mi Cartera de Préstamos" — a Spanish-language PWA for managing personal loans (préstamos). Built with Next.js 16 (App Router), it uses an offline-first architecture with Dexie (IndexedDB) as the local database and Supabase as the remote backend, syncing bidirectionally.

## Commands

- `npm run dev` — Start dev server (uses webpack; PWA/service worker is disabled in dev)
- `npm run build` — Production build
- `npm run lint` — ESLint (next core-web-vitals + typescript config)

## Architecture

### Offline-First Data Flow

All reads come from **Dexie (IndexedDB)**. Writes go to Dexie first, then push to Supabase asynchronously (fire-and-forget). On app load and via Supabase realtime subscriptions, remote data is pulled and merged into Dexie (Supabase is the source of truth during sync).

```
UI ←(reads)← Dexie (IndexedDB)
UI →(writes)→ Dexie →(push)→ Supabase
App load / realtime → Supabase →(pull)→ Dexie
```

Key files:
- `src/lib/db/dexie.ts` — Dexie schema (tables: loans, cycles, payments)
- `src/lib/db/sync.ts` — Push/pull/syncAll functions + Supabase realtime subscriptions
- `src/lib/db/loans.ts`, `cycles.ts`, `payments.ts` — CRUD operations (write to Dexie, then push)

### Interest Calculation Logic (`src/lib/utils/interest.ts`)

- Days 0–14: **10%** on principal
- Day 15+: **15%** on principal
- Simple interest only (no compounding)
- Due date = same day next month from cycle start
- New cycles start on the **due date** of the previous cycle (not the payment date), preserving the original day-of-month

### Loan Cycle Model

A loan has multiple **cycles**. Each cycle represents one interest period (~30 days). Payment types:
- `complete` — Pays principal + interest, closes the loan
- `interest_only` — Pays interest, closes current cycle, starts a new cycle from the due date
- `partial` — Reduces principal; if principal reaches 0, loan completes

### Authentication

- Supabase Auth with cookie-based sessions
- Middleware (`src/middleware.ts`) protects all routes except `/login` and `/register`
- `AuthProvider` wraps the app, provides `useAuth()` hook
- Two Supabase client factories: `src/lib/supabase/client.ts` (browser) and `src/lib/supabase/server.ts` (server components/route handlers)
- All data is scoped by `user_id`

### UI Stack

- **shadcn/ui** (new-york style) with Tailwind CSS v4 — components in `src/components/ui/`
- **Dark mode only** (`<html lang="es" className="dark">`)
- Mobile-first with bottom navigation (`BottomNav`) and no desktop-specific layouts
- Currency formatted as Colombian Pesos (COP): `src/lib/utils/format.ts`
- Icons: lucide-react
- Forms: react-hook-form + zod
- Charts: recharts

### Environment Variables

Required (not committed):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Path Aliases

`@/*` maps to `./src/*` (configured in tsconfig.json).

### Supabase Tables

Three tables mirroring the Dexie schema: `loans`, `cycles`, `payments`. All have `user_id` for row-level scoping. The Dexie schema is at version 2 (added `user_id` index).

## Conventions

- All user-facing text is in **Spanish**
- Code comments and JSDoc are in Spanish
- Dates stored as ISO 8601 strings; parsed as local midnight to avoid timezone drift (`parseLocalDate` pattern used in both `interest.ts` and `format.ts`)
- UUIDs (v4) used for all entity IDs, generated client-side
- Supabase pushes are fire-and-forget (no await, errors logged only)
