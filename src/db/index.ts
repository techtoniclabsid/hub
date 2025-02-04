import * as schema from "@/db/schema";
import { drizzle } from "drizzle-orm/node-postgres";

//@ts-expect-error ignore semantic error from ts
export const db = drizzle({ schema });
export type TDbClient = typeof db;
