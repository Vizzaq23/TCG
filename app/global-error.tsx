"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled root application error", error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          alignItems: "center",
          background: "#07090d",
          color: "#f7f8fa",
          display: "flex",
          fontFamily: "system-ui, sans-serif",
          justifyContent: "center",
          margin: 0,
          minHeight: "100vh",
          padding: 24,
        }}
      >
        <main style={{ maxWidth: 520, textAlign: "center" }}>
          <h1>Something went wrong</h1>
          <p style={{ color: "#a2adbd", lineHeight: 1.6 }}>
            Please retry. If this happened during checkout, verify the payment in
            Stripe before submitting again.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              background: "#f6c75b",
              border: 0,
              borderRadius: 12,
              color: "#07090d",
              cursor: "pointer",
              fontWeight: 700,
              minHeight: 44,
              padding: "10px 20px",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
