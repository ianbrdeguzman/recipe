import path from "node:path";

import type { NextConfig } from "next";

function getSupabaseImageRemotePatterns() {
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    return [];
  }

  return [new URL("/storage/v1/object/public/recipe-images/**", supabaseUrl)];
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: getSupabaseImageRemotePatterns(),
  },
  turbopack: {
    root: path.join(__dirname, "..", ".."),
  },
};

export default nextConfig;
