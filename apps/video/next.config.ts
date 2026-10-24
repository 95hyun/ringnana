import type { NextConfig } from "next";

// LAN IP로 다른 노트북이 접속할 때 개발 리소스가 막히지 않도록 허용 호스트를 환경변수로 받는다 (spec §13)
const allowedDevOrigins = (process.env.ALLOWED_DEV_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  allowedDevOrigins,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
