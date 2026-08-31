"use client";

import { useEffect } from "react";

export function CheckoutCompletion({ sessionId }: { sessionId: string }) {
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/shop/checkout/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
      signal: controller.signal,
    });
    return () => controller.abort();
  }, [sessionId]);

  return null;
}
