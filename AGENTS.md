# QR Attendance — Agent Guide

## Next.js 16 breaking changes

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

## Commands

| Command         | What                 |
| --------------- | -------------------- |
| `bun run dev`   | dev server           |
| `bun run build` | production build     |
| `bun run lint`  | ESLint (flat config) |

Package manager is **bun** (lockfile: `package-lock.json`). (prettier CLI is installed) .

## Tech stack

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript (strict)
- **Styling**: Tailwind CSS v4 — use `@import "tailwindcss"` in CSS, NOT `@tailwind` directives; PostCSS plugin is `@tailwindcss/postcss`, not `tailwindcss`
- **UI components**: shadcn/ui (Tailwind v4 native, based on `@base-ui/react`)
- **Icons**: `iconsax-react` + `lucide-react` (shadcn dependency)
- **Font**: Google Sans (variable, via `next/font/google`)
- **Theme**: Green (OKLCH, hue 167.03 — #61E786), dark mode via `.dark` class
- **Database + Auth**: Supabase — Postgres + RLS (not installed yet)
- **QR**: `qrcode` (generation) + `html5-qrcode` (scanning) — not installed yet

## Layout & conventions

- `@/*` path alias → `./src/*`
- `src/app/` — only directory so far; routes go here as App Router segments
- `PROJECT-SPEC.md` — authoritative blueprint: schema, roles, routes, business logic
- No test framework or CI configured

## Auth & roles (from PROJECT-SPEC.md)

- Single `users` table with `role IN ('lecturer', 'student')` — not separate tables
- Lecturers log in with **email + password**; students log in with **matric number + password**
- Both use the same `/login` page with a role-based redirect after auth
- Student accounts are **pre-seeded** — no self-registration

## QR scan validation order (must be sequential)

1. Session exists?
2. `expires_at` in the future?
3. Already an attendance record for this student + session?
4. All pass → insert attendance record

## Routes (planned)

```
/                          → redirect based on role
/login                     → shared login
/lecturer/dashboard        → course grid
/lecturer/courses/[id]     → course detail (QR gen, timetable, attendance list)
/lecturer/courses/[id]/stats → stats
/student/dashboard         → QR scanner + recent attendance history
```
