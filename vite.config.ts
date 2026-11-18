// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // Pin production builds to Vercel's Nitro output instead of the Cloudflare default.
  // Explicitly trace Playwright into the Vercel function output. These source
  // adapters use dynamic loading and Playwright itself loads runtime files by
  // path, so relying on the default server bundle trace can omit the package.
  nitro: {
    preset: "vercel",
    traceDeps: ["playwright", "playwright-core", "@sparticuz/chromium"],
  } as { preset: string; traceDeps: string[] },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    // Keep browser automation packages external to the Node server runtime.
    ssr: { external: ["playwright", "playwright-core", "chromium-bidi", "@sparticuz/chromium"] },
    build: {
      rolldownOptions: {
        external: [/^playwright(-core)?(\/.*)?$/, /^chromium-bidi(\/.*)?$/, /^@sparticuz\/chromium(\/.*)?$/],
      },
    },
  },
});
