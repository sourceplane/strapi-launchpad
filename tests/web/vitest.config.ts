import { defineConfig } from "vitest/config";
import * as path from "node:path";

// The site imports its own modules as `@/…` (apps/web/tsconfig.json `paths`,
// the app's root); the alias makes the same specifiers resolve from here.
const app = path.resolve(__dirname, "../../apps/web");

export default defineConfig({
  resolve: {
    alias: [{ find: /^@\//, replacement: `${app}/` }],
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    // next/server and next/headers are CommonJS that vitest must inline to
    // resolve their `next/dist/…` requires the way the app's build does.
    server: { deps: { inline: [/next/] } },
  },
});
