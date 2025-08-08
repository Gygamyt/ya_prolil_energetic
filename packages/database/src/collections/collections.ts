import { Db, Collection } from 'mongodb';
import { z } from 'zod';
import { RawRecordSchema } from "@repo/google-integration/src/zod-helper/employee.schema.ts";
import { cleanEmployeeObjectSchema } from "@repo/shared/src/schemas";


// Инферим TS-типы из Zod-схем
export type RawRecord = z.infer<typeof RawRecordSchema>;
export type CleanEmployeeObject = z.infer<typeof cleanEmployeeObjectSchema>;

/**
 * Возвращает объект с доступом к двум коллекциям:
 * - rawData: «сырые» записи из Google Sheets
 * - employees: валидированные объекты сотрудников
 */
export function getCollections(db: Db) {
    return {
        rawData: db.collection<RawRecord>('employees.raw'),
        employees: db.collection<CleanEmployeeObject>('employees.clean'),
    };
}
