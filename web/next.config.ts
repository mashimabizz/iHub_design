import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Workspace root を明示的に web/ に固定（lockfile 検知の警告抑止）
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
