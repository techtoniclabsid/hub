import * as schema from "@/db/schema";
import { drizzle } from "drizzle-orm/node-postgres";

export const db = drizzle({
  schema,
  connection: { connectionString: process.env.DATABASE_URL, ssl: true },
});
export type TDbClient = typeof db;
