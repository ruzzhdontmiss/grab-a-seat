import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import { env } from "@/lib/env";
import * as schema from "./schema";

/**
 * Neon serverless (HTTP) Drizzle client.
 *
 * The schema is passed so `db.query.*` relational helpers and better-auth's
 * drizzle adapter can resolve tables by identity.
 */
const sql = neon(env.DATABASE_URL);

export const db = drizzle(sql, { schema });

export { schema };
