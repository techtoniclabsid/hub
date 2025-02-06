import { z } from "zod";

export const GrantTypesSchema = z.enum(["client_credentials"]);

export type TGrantTypes = z.infer<typeof GrantTypesSchema>;
