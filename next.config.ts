import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse (via pdfjs-dist) dynamically imports its worker script by a
  // real on-disk path at runtime — bundling it rewrites that path into a
  // virtual chunk path that doesn't exist, breaking the parse-pdf route.
  // Leaving it external lets Node require it straight from node_modules.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
};

export default nextConfig;
