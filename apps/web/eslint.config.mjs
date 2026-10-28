// Upstream's lint config, `{ "extends": "next/core-web-vitals" }`
// (next/.eslintrc.json), in eslint-config-next 16's flat form — Next 16
// removed `next lint`, which upstream's script still calls.
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  {
    // React Compiler rules eslint-config-next 16 added after the template's
    // animation components (the globe, the sparkles, the beams, the marquee)
    // were written: they mutate refs and set state in effects by design.
    // Off by name; every other core-web-vitals rule applies.
    rules: {
      "react-hooks/immutability": "off",
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
    },
  },
  globalIgnores([".next/**", ".open-next/**", ".wrangler/**", "next-env.d.ts"]),
]);
