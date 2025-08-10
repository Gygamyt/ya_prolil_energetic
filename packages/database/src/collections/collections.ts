import type { Db, Collection } from 'mongodb';
import { z } from 'zod';
import { RawRecordSchema } from "@repo/google-integration/src/zod-helper/employee.schema";
import { cleanEmployeeObjectSchema } from "@repo/shared/src/schemas";

export type RawRecord = z.infer<typeof RawRecordSchema>;
export type CleanEmployeeObject = z.infer<typeof cleanEmployeeObjectSchema>;

export function getCollections(db: Db): {
    rawData: Collection<RawRecord>;
    employees: Collection<CleanEmployeeObject>;
} {
    return {
        rawData: db.collection<RawRecord>('employees.raw'),
        employees: db.collection<CleanEmployeeObject>('employees.clean')
    };
}
