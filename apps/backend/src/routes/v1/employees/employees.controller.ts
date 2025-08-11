import { ObjectId } from 'mongodb';
import { CreateEmployeeInput, UpdateEmployeeInput, EmployeeSearchQuery } from './employees.schemas';
import { EmployeeRepository } from "@repo/database/src/repositories";
import { MongoDBClient } from "@repo/database/src/client";

const db = await MongoDBClient.getClient();
const employeeRepository = new EmployeeRepository(db);

export const createEmployeeHandler = async (data: unknown) => {
    const input = CreateEmployeeInput.parse(data);
    return employeeRepository.create(input);
};

export const getEmployeeHandler = async (id: string) => {
    if (!ObjectId.isValid(id)) {
        throw new Error('Invalid employee ID');
    }

    const employee = await employeeRepository.findById(id);
    if (!employee) {
        throw new Error('Employee not found');
    }

    return employee;
};

export const getAllEmployeesHandler = async (query: unknown) => {
    const searchQuery = EmployeeSearchQuery.parse(query);

    const filter: any = {};
    if (searchQuery.name) filter['Name'] = { $regex: searchQuery.name, $options: 'i' };
    if (searchQuery.grade) filter['Grade'] = searchQuery.grade;
    if (searchQuery.teamLead) filter['Team Lead'] = searchQuery.teamLead;
    if (searchQuery.country) filter['Country'] = searchQuery.country;

    return employeeRepository.findAll(filter);
};

export const updateEmployeeHandler = async (id: string, data: unknown) => {
    if (!ObjectId.isValid(id)) {
        throw new Error('Invalid employee ID');
    }

    const input = UpdateEmployeeInput.parse(data);
    const employee = await employeeRepository.updateById(id, input);

    if (!employee) {
        throw new Error('Employee not found');
    }

    return employee;
};

export const deleteEmployeeHandler = async (id: string) => {
    if (!ObjectId.isValid(id)) {
        throw new Error('Invalid employee ID');
    }

    const deleted = await employeeRepository.deleteById(id);
    if (!deleted) {
        throw new Error('Employee not found');
    }

    return { success: true };
};
