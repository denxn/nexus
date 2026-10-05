import type { MetadataRoute } from "next";

// Private app: ask crawlers to stay away from everything.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
