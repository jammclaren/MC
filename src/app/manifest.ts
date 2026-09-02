import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WESMINCOM Tactical C2 Dashboard",
    short_name: "WESMINCOM C2",
    description: "Internal command-and-control monitoring dashboard for WESMINCOM.",
    start_url: "/",
    display: "standalone",
    background_color: "#090d0e",
    theme_color: "#090d0e",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
