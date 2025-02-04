import { z } from "zod";

export const ESort = z.enum(["asc", "desc"]);

export const SelectParamsSchema = z.object({
  limit: z.number().min(0).default(0),
  page: z.number().min(1).default(1),
  sortBy: z.string().optional(),
  sort: ESort.default(ESort.Enum.asc),
});

export type TSelectParams = z.infer<typeof SelectParamsSchema>;
