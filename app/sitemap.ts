import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const site = getSiteUrl();
  const pages = [
    { path: "/", changeFrequency: "weekly", priority: 1 },
    { path: "/browse", changeFrequency: "daily", priority: 0.9 },
    { path: "/shop", changeFrequency: "daily", priority: 0.9 },
    { path: "/social", changeFrequency: "daily", priority: 0.7 },
    { path: "/compare", changeFrequency: "weekly", priority: 0.6 },
  ] as const;

  return pages.map((page) => ({
    url: new URL(page.path, site).toString(),
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}
