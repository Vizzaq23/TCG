"use client";

import { useCallback, useState } from "react";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { cn } from "@/lib/cn";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const ALLOWED_EXT = /\.(jpe?g|png|webp|gif)$/i;
const MAX_BYTES = 2 * 1024 * 1024;

type Props = {
  previewSrc: string | null;
  name: string;
  accentColor: string;
  disabled?: boolean;
  uploading?: boolean;
  onFile: (file: File) => void;
  onClear: () => void;
  onError: (message: string) => void;
};

function isAllowedImage(file: File): boolean {
  if (ALLOWED_TYPES.has(file.type)) return true;
  if (!file.type && ALLOWED_EXT.test(file.name)) return true;
  if (file.type.startsWith("image/") && ALLOWED_EXT.test(file.name)) return true;
  return false;
}

export function AvatarDropzone({
  previewSrc,
  name,
  accentColor,
  disabled,
  uploading,
  onFile,
  onClear,
  onError,
}: Props) {
  const [dragging, setDragging] = useState(false);

  const takeFile = useCallback(
    (file: File | undefined | null) => {
      if (!file) {
        onError("No image file detected. Try clicking to browse instead.");
        return;
      }
      if (!isAllowedImage(file)) {
        onError("Use a JPG, PNG, WebP, or GIF image.");
        return;
      }
      if (file.size > MAX_BYTES) {
        onError("Image must be 2MB or smaller.");
        return;
      }
      onFile(file);
    },
    [onError, onFile],
  );

  const blocked = Boolean(disabled || uploading);

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "relative flex flex-col items-center gap-3 overflow-hidden rounded-[14px] border border-dashed px-4 py-6 text-center transition",
          dragging
            ? "border-amber-400/80 bg-amber-500/10"
            : "border-zinc-700 bg-zinc-950/50 hover:border-zinc-500 hover:bg-zinc-900/40",
          blocked && "opacity-60",
        )}
      >
        <ProfileAvatar
          src={previewSrc}
          name={name}
          size="lg"
          accentColor={accentColor}
        />
        <div className="pointer-events-none space-y-1">
          <p className="text-sm font-medium text-zinc-200">
            {uploading
              ? "Uploading…"
              : dragging
                ? "Drop to upload"
                : "Drag & drop a profile photo"}
          </p>
          <p className="text-xs text-zinc-500">
            or click to browse · JPG, PNG, WebP, GIF · max 2MB
          </p>
        </div>

        {/* Covers the whole card: click-to-browse + native OS drag/drop */}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
          disabled={blocked}
          aria-label="Upload profile photo"
          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          onDragEnter={() => {
            if (!blocked) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={() => setDragging(false)}
          onChange={(e) => {
            takeFile(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />
      </div>

      {previewSrc ? (
        <button
          type="button"
          disabled={blocked}
          onClick={() => onClear()}
          className="relative z-20 text-xs font-medium text-zinc-500 underline-offset-2 hover:text-red-300 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40 disabled:opacity-50"
        >
          Remove photo
        </button>
      ) : null}
    </div>
  );
}
