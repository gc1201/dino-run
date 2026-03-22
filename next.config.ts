import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Serve the standalone animation HTML from /public without transformation
  async headers() {
    return [
      {
        source: "/sprint_tracker.html",
        headers: [{ key: "X-Frame-Options", value: "SAMEORIGIN" }],
      },
    ];
  },
};

export default nextConfig;
