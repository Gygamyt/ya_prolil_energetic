import { z } from 'zod';
import { cleanEmployeeObjectSchema } from "@repo/shared/src/schemas";
import { createJsonSchemaFromZod } from "@app/utils/zod/type-to-schema";


export const Employee = cleanEmployeeObjectSchema.extend({
    _id: z.string()
});

export const CreateEmployeeInput = cleanEmployeeObjectSchema;
export const UpdateEmployeeInput = cleanEmployeeObjectSchema.partial();

export const EmployeeJsonSchema = createJsonSchemaFromZod(Employee, {
    name: 'Employee'
});

export const CreateEmployeeJsonSchema = createJsonSchemaFromZod(CreateEmployeeInput, {
    name: 'CreateEmployeeInput'
});

export const UpdateEmployeeJsonSchema = createJsonSchemaFromZod(UpdateEmployeeInput, {
    name: 'UpdateEmployeeInput'
});

export const EmployeeSearchQuery = z.object({
    name: z.string().optional(),
    grade: z.enum(["Intern", "Junior", "Middle", "Senior", "No"]).optional(),
    skill: z.string().optional(),
    level: z.enum(["Low", "Medium", "High", "No", "On check"]).optional(),
    teamLead: z.string().optional(),
    country: z.string().optional(),
}).partial();

export const EmployeeSearchJsonSchema = createJsonSchemaFromZod(EmployeeSearchQuery, {
    name: 'EmployeeSearchQuery'
});
