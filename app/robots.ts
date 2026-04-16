import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login"],
        disallow: ["/dashboard", "/customers", "/forecast", "/settings", "/upgrade", "/share/", "/api/"],
      },
    ],
    sitemap: "https://revenueintelligence.co.uk/sitemap.xml",
  };
}
