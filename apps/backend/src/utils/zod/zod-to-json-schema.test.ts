import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { createJsonSchemaFromZod } from "@app/utils/zod/type-to-schema";

describe('createJsonSchemaFromZod', () => {
    it('should extract enum values correctly', () => {
        const TestSchema = z.object({
            grade: z.enum(['Junior', 'Senior']),
            name: z.string()
        });

        const result = createJsonSchemaFromZod(TestSchema);

        expect(result.properties.grade.enum).toEqual(['Junior', 'Senior']);
        expect(result.properties.name.type).toBe('string');
    });
});
