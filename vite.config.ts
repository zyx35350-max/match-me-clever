// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // Pin production builds to Vercel's Nitro output instead of the Cloudflare default.
  // Explicitly copy browser automation packages into the Vercel function output.
  // Playwright resolves its driver files dynamically, so a file-only trace can
  // omit the package even though its entry point is referenced by the bundle.
  nitro: {
    preset: "vercel",
    traceDeps: ["playwright*", "@sparticuz/chromium*"],
  } as { preset: string; traceDeps: string[] },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
