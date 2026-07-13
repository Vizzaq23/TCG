"use client";

import { useCallback, useId, useRef, useState } from "react";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { cn } from "@/lib/cn";

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
const MAX_BYTES = 2 * 1024 * 1024;

type Props = {
  previewSrc: string | null;
  name: string;
  accentColor: string;
  disabled?: boolean;
  onFile: (file: File) => void;
  onClear: () => void;
  onError: (message: string) => void;
};

export function AvatarDropzone({
  previewSrc,
  name,
  accentColor,
  disabled,
  onFile,
  onClear,
  onError,
}: Props) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const takeFile = useCallback(
    (file: File | undefined | null) => {
      if (!file) return;
      if (!ACCEPT.split(",").includes(file.type)) {
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

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!disabled) setDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragging(false);
          if (disabled) return;
          takeFile(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-3 rounded-[14px] border border-dashed px-4 py-5 text-center transition",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40",
          dragging
            ? "border-amber-400/70 bg-amber-500/10"
            : "border-zinc-700 bg-zinc-950/50 hover:border-zinc-500 hover:bg-zinc-900/40",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <ProfileAvatar
          src={previewSrc}
          name={name}
          size="lg"
          accentColor={accentColor}
        />
        <div className="space-y-1">
          <p className="text-sm font-medium text-zinc-200">
            {dragging ? "Drop image to upload" : "Drag & drop a profile photo"}
          </p>
          <p className="text-xs text-zinc-500">
            or click to browse · JPG, PNG, WebP, GIF · max 2MB
          </p>
        </div>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          disabled={disabled}
          onChange={(e) => {
            takeFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      {previewSrc ? (
        <button
          type="button"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          className="text-xs font-medium text-zinc-500 underline-offset-2 hover:text-red-300 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40 disabled:opacity-50"
        >
          Remove photo
        </button>
      ) : null}
    </div>
  );
}
