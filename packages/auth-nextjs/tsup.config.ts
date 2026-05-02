import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.tsx"],
  format: ["esm", "cjs"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false,
  target: "es2022",
  external: ["react", "react-dom", "next", "@ricardoqmd/auth-core", "@xstate/react"],
  banner: {
    js: '"use client";',
  },
});
