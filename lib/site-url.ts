import { getAppBaseUrl } from "@/lib/shop/config";

export function getSiteUrl(): URL {
  try {
    return new URL(getAppBaseUrl());
  } catch {
    return new URL("http://localhost:3000");
  }
}
