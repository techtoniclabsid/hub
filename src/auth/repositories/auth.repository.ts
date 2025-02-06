import { TDbClient } from "@/db";
import { OauthAppsSchema } from "@/db/schema";
import { eq } from "drizzle-orm";

export class AuthRepository {
  static getById(db: TDbClient, clientId: string) {
    return db.query.OauthAppsSchema.findFirst({
      where: eq(OauthAppsSchema.clientId, clientId),
    });
  }
}
