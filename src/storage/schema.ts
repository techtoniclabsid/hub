import { z } from "zod";

export const SIZE_1B = 1;
export const SIZE_1K = SIZE_1B * 1000;
export const SIZE_1M = SIZE_1K * 1000;
export const SIZE_1G = SIZE_1M * 1000;

export const PutObjectSchema = z.object({
  filename: z.string(),
  size: z.number().positive().min(SIZE_1B).max(SIZE_1G),
  prefix: z.string().optional(),
});

export type TPutObjectSchema = z.infer<typeof PutObjectSchema>;

export const UpdateStorageSchema = z
  .object({
    storage: z.number().positive(),
    remaining: z.number().min(0),
    bucket: z.string(),
  })
  .partial()
  .refine(
    ({ storage, remaining, bucket }) =>
      storage !== undefined || remaining !== undefined || bucket !== undefined,
    { message: "One or more field is needed" }
  );

export type TUpdateStorageSchema = z.infer<typeof UpdateStorageSchema>;
