import type { FastifyPluginAsync } from 'fastify';
import {
    CreateEmployeeJsonSchema,
    UpdateEmployeeJsonSchema,
    EmployeeJsonSchema,
    EmployeeSearchJsonSchema
} from './employees.schemas';
import {
    createEmployeeHandler,
    getEmployeeHandler,
    getAllEmployeesHandler,
    updateEmployeeHandler,
    deleteEmployeeHandler
} from './employees.controller';

export const employeesRoute: FastifyPluginAsync = async (app) => {
    app.get('/', {
        schema: {
            querystring: EmployeeSearchJsonSchema,
            response: {
                200: {
                    type: 'array',
                    items: EmployeeJsonSchema
                }
            },
            tags: ['employees'],
            summary: 'Get all employees'
        }
    }, async (req, reply) => {
        try {
            const employees = await getAllEmployeesHandler(req.query);
            reply.send(employees);
        } catch (error) {
            // @ts-ignore
            reply.code(400).send({ error: error.message });
        }
    });

    app.get('/:id', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' }
                }
            },
            response: {
                200: EmployeeJsonSchema,
                404: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' }
                    }
                }
            },
            tags: ['employees'],
            summary: 'Get employee by ID'
        }
    }, async (req, reply) => {
        try {
            // @ts-ignore
            const employee = await getEmployeeHandler(req.params.id);
            reply.send(employee);
        } catch (error) {
            // @ts-ignore
            reply.code(404).send({ error: error.message });
        }
    });

    app.post('/', {
        schema: {
            body: CreateEmployeeJsonSchema,
            response: {
                201: EmployeeJsonSchema,
                400: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' }
                    }
                }
            },
            tags: ['employees'],
            summary: 'Create employee'
        }
    }, async (req, reply) => {
        try {
            const employee = await createEmployeeHandler(req.body);
            reply.code(201).send(employee);
        } catch (error) {
            // @ts-ignore
            reply.code(400).send({ error: error.message });
        }
    });

    app.put('/:id', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' }
                }
            },
            body: UpdateEmployeeJsonSchema,
            response: {
                200: EmployeeJsonSchema,
                404: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' }
                    }
                }
            },
            tags: ['employees'],
            summary: 'Update employee'
        }
    }, async (req, reply) => {
        try {
            // @ts-ignore
            const employee = await updateEmployeeHandler(req.params.id, req.body);
            reply.send(employee);
        } catch (error) {
            // @ts-ignore
            reply.code(404).send({ error: error.message });
        }
    });

    app.delete('/:id', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' }
                    }
                }
            },
            tags: ['employees'],
            summary: 'Delete employee'
        }
    }, async (req, reply) => {
        try {
            // @ts-ignore
            const result = await deleteEmployeeHandler(req.params.id);
            reply.send(result);
        } catch (error) {
            // @ts-ignore
            reply.code(404).send({ error: error.message });
        }
    });
};
