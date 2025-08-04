import { cleanEmployeeObjectSchema, RawRecordSchema, RowSchema } from "./employee.schema.ts";
import { z } from "zod";

export type Row = z.infer<typeof RowSchema>;
export type RecordTuple = z.infer<typeof RawRecordSchema>;
export type RecordObject = {
    [Index in keyof RecordTuple]: RecordTuple[Index] extends boolean
        ? boolean
        : RecordTuple[Index] extends string
            ? string
            : never;
};
export const cleanEmployeeArraySchema = z.array(cleanEmployeeObjectSchema);
export type CleanEmployeeArray = z.infer<typeof cleanEmployeeArraySchema>;
export type cleanEmployeeObject = z.infer<typeof cleanEmployeeObjectSchema>
