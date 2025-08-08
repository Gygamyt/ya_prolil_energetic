import { z } from "zod";
import { cleanEmployeeObjectSchema } from "@repo/shared/src/schemas";

export const cleanEmployeeArraySchema = z.array(cleanEmployeeObjectSchema);
export type CleanEmployeeArray = z.infer<typeof cleanEmployeeArraySchema>;
