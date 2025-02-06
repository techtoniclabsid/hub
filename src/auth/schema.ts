import { z } from "zod";

export const GrantTypesSchema = z.enum(["client_credentials"]);

export type TGrantTypes = z.infer<typeof GrantTypesSchema>;

export const VerifiedTokenSchema = z.object({
  jti: z.string().cuid2(),
  iss: z.string().url(),
  sub: z.string().cuid2(),
  scope: z.string().optional(),
  iat: z.number().positive(),
  exp: z.number().positive(),
});

export type TVerifiedToken = z.infer<typeof VerifiedTokenSchema>;
