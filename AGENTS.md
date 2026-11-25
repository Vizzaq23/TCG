<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## One Piece TCG Shelf

Start with the README's quick start and use `npm run dev` to open the app locally. For changes to route behavior, consult `docs/API.md` and follow the corresponding collection, profile, or trade flow in the UI.

- For collection valuation, check a holding with multiple copies, a manual price override, and a card without a cached price. Keep pricing credentials on the server.
- For changes to sharing or trades, check what the owner, another signed-in collector, and a signed-out visitor can see or change. Use separate test accounts for ownership checks.
- For a collector-facing UI change, give the starting page, the action to take, and the result a collector should see. Check the flow at phone width and include a screenshot when a preview is available.

Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` in the configured checkout. Report which checks ran and any setup needed to reproduce a skipped check.
