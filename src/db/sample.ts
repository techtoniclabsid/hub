import { db } from ".";
import {
  ClientSchema,
  PackageSchema,
  WebsiteSchema,
  OauthAppsSchema,
} from "./schema";

export async function addNew() {
  const newClient = await db
    .insert(ClientSchema)
    .values({
      name: "developer",
    })
    .returning();

  const newPackage = await db
    .insert(PackageSchema)
    .values({
      name: "Nano",
      description: "Hanya satu halaman",
      startsFrom: 500000,
    })
    .returning();

  const newWebsite = await db
    .insert(WebsiteSchema)
    .values({
      name: "Sirama Blog",
      url: "sirama.blog",
      dealPrice: 1000000,
      annualFee: 500000,
      clientId: newClient[0].id,
      packageId: newPackage[0].id,
    })
    .returning();

  const newApp = await db
    .insert(OauthAppsSchema)
    .values({
      clientId: "qlva0hrx5c13okcdn8b7yh0e",
      clientSecret:
        "CY01cRQacnhrM8fW47Yz63AiK0nyie6195zWPf8TJ8Pqs3CWdeoqyMQVLlYcUkbi",
      scope: "storage:put storage:delete storage:get",
      name: "Sirama Blog",
      accountId: newWebsite[0].id,
    })
    .returning();

  return Response.json({ data: newApp[0] }, { status: 201 });
}
