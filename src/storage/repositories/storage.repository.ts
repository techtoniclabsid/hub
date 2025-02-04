import { TSelectParams } from "@/core/schema";
import { TDbClient } from "@/db";
import { StorageSchema } from "@/db/schema";
import { eq } from "drizzle-orm";

export class StorageRepository {
  static async get(db: TDbClient, id: string) {
    const result = await db.query.StorageSchema.findMany({
      where: eq(StorageSchema.id, id),
    });
    return result.length === 1 ? result[0] : null;
  }

  static async getAll(db: TDbClient, params?: TSelectParams) {
    return await db.query.StorageSchema.findMany({
      limit: params?.limit,
    });
  }
}
