import { NextResponse } from "next/server";

/**
 * Former open user sync endpoint — disabled to protect JustTCG quota.
 * Use `npm run prices:sync` or POST /api/admin/prices/refresh with PRICE_SYNC_SECRET.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: "Removed. Use npm run prices:sync or POST /api/admin/prices/refresh with PRICE_SYNC_SECRET.",
    },
    { status: 410 },
  );
}

export async function GET() {
  return NextResponse.json({
    configured: Boolean(process.env.JUSTTCG_API_KEY?.trim()),
    sync: "npm run prices:sync",
    admin: "/api/admin/prices/refresh",
  });
}
