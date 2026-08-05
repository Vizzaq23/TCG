<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

This is a Next.js 16 + local Supabase (Postgres/Auth/Storage in Docker) app. Standard scripts live in `package.json` and are documented in `README.md` (`npm run dev|build|start|lint|test`, `import:catalog`). Notes below are the non-obvious bits for this VM.

### Node version (important)
`dev`/`build`/`start` wrap Next with `scripts/node-system-ca.mjs`, which sets `NODE_OPTIONS=--use-system-ca`. The sandbox's `/exec-daemon/node` rejects that flag; the nvm-managed Node (v22.22.x) accepts it. `~/.bashrc` is configured to prepend the nvm node for login shells, so run app commands in a login shell (`bash -l`, i.e. `bash -lc '...'`). If you hit `--use-system-ca is not allowed in NODE_OPTIONS`, you're on the wrong node — check `which node`.

### Local Supabase (required for the app to run / auth / data)
- Start the Docker daemon first (no systemd here): `sudo dockerd > /tmp/dockerd.log 2>&1 &`, then `sudo chmod 666 /var/run/docker.sock`. It uses the `fuse-overlayfs` storage driver (`/etc/docker/daemon.json`).
- Start the stack: `npx supabase start` (API on `127.0.0.1:54321`, Studio `54323`, mail UI `54324`). Migrations under `supabase/migrations/` apply automatically.
- `.env.local` is gitignored — regenerate it after `supabase start` from `npx supabase status -o env` (map `API_URL`→`NEXT_PUBLIC_SUPABASE_URL`, `ANON_KEY`→`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SERVICE_ROLE_KEY`→`SUPABASE_SERVICE_ROLE_KEY`). `JUSTTCG_API_KEY`/`PRICE_SYNC_SECRET` can stay blank (market-price sync is optional).

### Two known local-Supabase gotchas
1. Table exposure: the migrations only `grant execute` on RPCs and never grant table privileges, so they rely on legacy auto-exposed tables. `supabase/config.toml` now sets `auto_expose_new_tables = true` for this reason. If you see `permission denied for table ...`, confirm that setting and run `npx supabase db reset --yes`.
2. Catalog import: `npm run import:catalog` fails with `no unique or exclusion constraint matching the ON CONFLICT specification` because `cards.card_number` only has a *partial* unique index (`where card_number is not null`), which Postgres won't use as an `ON CONFLICT` arbiter. Workaround (table is empty after a reset, so a plain insert is fine): generate JSON with `npm run import:catalog:json`, compact it to one line, then `\copy` into a temp `jsonb` column (CSV format with control-char quote/delimiter, e.g. `quote e'\x01', delimiter e'\x02'`) and expand via `jsonb_to_recordset` into `public.cards`.

### Run + verify
`npm run dev` serves on `http://localhost:3000`. Email confirmation is disabled locally (`enable_confirmations = false`), so signup logs you straight in. Smoke test: `/browse` should list real cards once the catalog is seeded; signup at `/signup`, then "Add to collection" on a card, then check `/collection`.
