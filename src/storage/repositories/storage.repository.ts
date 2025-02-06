import { TSelectParams } from "@/core/schema";
import { TDbClient } from "@/db";
import { StorageSchema } from "@/db/schema";
import { eq } from "drizzle-orm";
import { TUpdateStorageSchema } from "../schema";

export class StorageRepository {
  static get(db: TDbClient, id: string) {
    return db.query.StorageSchema.findFirst({
      where: eq(StorageSchema.id, id),
    });
  }

  static getAll(db: TDbClient, params?: TSelectParams) {
    return db.query.StorageSchema.findMany({
      limit: params?.limit,
    });
  }

  static getByWebsiteId(db: TDbClient, websiteId: string) {
    return db.query.StorageSchema.findFirst({
      where: eq(StorageSchema.websiteId, websiteId),
    });
  }

  static update(db: TDbClient, storageId: string, data: TUpdateStorageSchema) {
    return db
      .update(StorageSchema)
      .set({ ...data })
      .where(eq(StorageSchema.id, storageId));
  }
}
