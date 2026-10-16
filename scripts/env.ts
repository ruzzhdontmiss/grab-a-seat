/**
 * Side-effect module: load `.env.local` before anything that imports
 * `src/lib/env.ts` is evaluated.
 *
 * Import this FIRST in every script — ESM evaluates dependencies in import
 * order, so `import "./env";` must precede any `src/lib/**` import.
 */

import { config } from "dotenv";

config({ path: ".env.local" });
