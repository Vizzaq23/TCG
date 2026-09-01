import { NextRequest, NextResponse } from "next/server";

const ALLOWED_HOSTS = new Set(["en.onepiece-cardgame.com"]);

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("url");
  if (!raw) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  if (parsed.protocol !== "https:" || !ALLOWED_HOSTS.has(parsed.hostname)) {
    return NextResponse.json({ error: "Host not allowed" }, { status: 400 });
  }

  const upstream = await fetch(parsed.toString(), {
    headers: {
      Referer: "https://en.onepiece-cardgame.com/",
      "User-Agent": "Mozilla/5.0 (compatible; OnePieceTCGShelf/1.0)",
    },
    cache: "no-store",
  });

  if (!upstream.ok) {
    return NextResponse.json(
      { error: "Upstream image failed" },
      { status: upstream.status },
    );
  }

  const contentType = upstream.headers.get("content-type") ?? "image/png";
  const bytes = await upstream.arrayBuffer();

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=604800, immutable",
    },
  });
}
