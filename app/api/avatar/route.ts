import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { Database } from "@/lib/types/database";

export const runtime = "nodejs";

const BUCKET = "avatars";
const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase service role configuration.");
  }
  return createServiceClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function ensureBucket(
  admin: ReturnType<typeof createServiceClient<Database>>,
) {
  const { data: buckets } = await admin.storage.listBuckets();
  const exists = buckets?.some((b) => b.id === BUCKET || b.name === BUCKET);
  if (exists) return;

  const { error } = await admin.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: MAX_BYTES,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  });
  // Ignore race if another request created it first.
  if (error && !/already exists|duplicate/i.test(error.message)) {
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No image file provided." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Image must be 2MB or smaller." }, { status: 400 });
    }

    const type = file.type || "image/jpeg";
    if (!ALLOWED.has(type) && !type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Use a JPG, PNG, WebP, or GIF image." },
        { status: 400 },
      );
    }

    const admin = serviceClient();
    await ensureBucket(admin);

    const ext =
      type === "image/png"
        ? "png"
        : type === "image/webp"
          ? "webp"
          : type === "image/gif"
            ? "gif"
            : "jpg";
    const path = `${user.id}/avatar.${ext}`;

    // Remove older variants.
    await admin.storage.from(BUCKET).remove([
      `${user.id}/avatar`,
      `${user.id}/avatar.jpg`,
      `${user.id}/avatar.jpeg`,
      `${user.id}/avatar.png`,
      `${user.id}/avatar.webp`,
      `${user.id}/avatar.gif`,
    ]);

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, buffer, {
      upsert: true,
      contentType: type,
      cacheControl: "3600",
    });
    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: publicData } = admin.storage.from(BUCKET).getPublicUrl(path);
    const avatarUrl = `${publicData.publicUrl}?v=${Date.now()}`;

    const { error: updateError } = await admin
      .from("profiles")
      .update({ avatar_url: avatarUrl })
      .eq("id", user.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ avatarUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const admin = serviceClient();
    await admin.storage.from(BUCKET).remove([
      `${user.id}/avatar`,
      `${user.id}/avatar.jpg`,
      `${user.id}/avatar.jpeg`,
      `${user.id}/avatar.png`,
      `${user.id}/avatar.webp`,
      `${user.id}/avatar.gif`,
    ]);

    const { error: updateError } = await admin
      .from("profiles")
      .update({ avatar_url: null })
      .eq("id", user.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Remove failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
