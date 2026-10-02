import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Repo already documents itself via README.md; skip Next.js auto-writing
  // AGENTS.md/CLAUDE.md on every `next dev` run.
  agentRules: false,
};

export default nextConfig;

// Allows `next dev` to access Cloudflare bindings (env vars, KV, etc.)
// declared in wrangler.jsonc during local development.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
