import { z } from 'zod';

const extractEnumFromZodField = (zodDef: any): string[] | null => {
    if (zodDef?.typeName === 'ZodEnum') {
        return Array.from(zodDef.values || []);
    }

    if (zodDef?.typeName === 'ZodNativeEnum') {
        return Object.values(zodDef.values || {});
    }

    if (zodDef?.typeName === 'ZodUnion') {
        const literals = zodDef.options
            ?.filter((opt: any) => opt._def?.typeName === 'ZodLiteral')
            ?.map((opt: any) => opt._def?.value);

        if (literals?.length > 0) {
            return literals;
        }
    }

    return null;
};

const extractSchemaStructure = (zodSchema: z.ZodTypeAny): any => {
    const def = zodSchema._def;

    switch (def.typeName) {
        case 'ZodObject': {
            const properties: Record<string, any> = {};
            const required: string[] = [];

            Object.entries(def.shape()).forEach(([key, fieldSchema]: [string, any]) => {
                const fieldStructure = extractSchemaStructure(fieldSchema);
                properties[key] = fieldStructure.schema;

                if (!fieldSchema.isOptional()) {
                    required.push(key);
                }
            });

            return {
                schema: {
                    type: 'object',
                    properties,
                    required: required.length > 0 ? required : undefined,
                    additionalProperties: false
                }
            };
        }

        case 'ZodString': {
            const enumValues = extractEnumFromZodField(def);

            if (enumValues) {
                return {
                    schema: {
                        type: 'string',
                        enum: enumValues
                    }
                };
            }

            return {
                schema: { type: 'string' }
            };
        }

        case 'ZodEnum':
        case 'ZodNativeEnum':
        case 'ZodUnion': {
            const enumValues = extractEnumFromZodField(def);

            return {
                schema: {
                    type: 'string',
                    enum: enumValues || []
                }
            };
        }

        case 'ZodOptional': {
            return extractSchemaStructure(def.innerType);
        }

        case 'ZodDefault': {
            const inner = extractSchemaStructure(def.innerType);
            return {
                ...inner,
                schema: {
                    ...inner.schema,
                    default: def.defaultValue()
                }
            };
        }

        default:
            return {
                schema: { type: 'string' }
            };
    }
};

export const createJsonSchemaFromZod = (
    zodSchema: z.ZodTypeAny,
    options: {
        name?: string;
        description?: string;
    } = {}
) => {
    const structure = extractSchemaStructure(zodSchema);

    return {
        ...structure.schema,
        ...(options.name && { title: options.name }),
        ...(options.description && { description: options.description })
    };
};
