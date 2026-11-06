import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // os testes e2e usam uma build separada (modo local) para não sobrescrever a de desenvolvimento
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
