# One Piece TCG Shelf

A collector platform for the **One Piece Card Game**. Browse the catalog, track what you own (quantity, condition, grades, trades), pin a three-card **Collector’s Showcase**, and share a public profile at `/u/yourname`.

## Features

- **Catalog browse** — search and filter cards; add to your collection
- **Collection dashboard** — edit quantities, conditions, graded slabs, trade flags
- **Collector’s Showcase** — pick up to three prized cards/slabs for your public shelf
- **Public profiles** — shareable shelf with trade filter and view analytics
- **Profile customization** — display name, bio, accent theme, drag-and-drop avatar
- **Auth** — email/password via Supabase (safe redirects after sign-in)

## Stack

- [Next.js](https://nextjs.org/) 16 (App Router) + React 19
- [Supabase](https://supabase.com/) (Postgres, Auth, Storage)
- [Tailwind CSS](https://tailwindcss.com/) 4 + Framer Motion

## Quick start

### 1. Install

```bash
npm install
```

### 2. Environment

Copy `.env.local.example` → `.env.local` and set:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon / public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only (avatar upload, catalog import) |

**Local Supabase:** run `npm run setup` (PowerShell) to start Docker Supabase and write env values.

**Hosted Supabase:** Project Settings → API. Apply all SQL under `supabase/migrations/` (SQL editor or `npx supabase db push`).

### 3. Catalog data

```bash
npm run import:catalog
```

Dry run / SQL / JSON variants: `import:catalog:dry`, `import:catalog:sql`, `import:catalog:json`.

### 4. Dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint |
| `npm run setup` | Local Supabase + `.env.local` (Windows) |
| `npm run import:catalog` | Upsert card catalog into Supabase |
| `npm run supabase` | Supabase CLI passthrough |

## Deploy (Vercel)

1. Push to GitHub and import the repo in Vercel.
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (and `SUPABASE_SERVICE_ROLE_KEY` for avatar uploads).
3. In Supabase Auth → URL configuration, add your Vercel URL and `/auth/callback`.
4. Ensure migrations are applied on the hosted project.

## Project structure

See **[STRUCTURE.md](./STRUCTURE.md)** for a folder/file tree with explanations of every important path.

## Docs for agents

- `AGENTS.md` / `CLAUDE.md` — Next.js version notes for coding agents
