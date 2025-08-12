//todo rework

// import { EmployeeRepository } from '@repo/database/src/repositories';
// import { MongoDBClient } from '@repo/database/src/client';
// import { logger } from '@repo/logger/src';
// import type { EmployeeDataSource } from '../tools/employee.tools.js';
// import { Employee, EmployeeSearchCriteria } from "@repo/shared/src/schemas";
//
//
// export class DatabaseEmployeeAdapter implements EmployeeDataSource {
//     private employeeRepository: EmployeeRepository | null = null;
//
//     constructor() {
//     }
//
//     async getAllEmployees(): Promise<Employee[]> {
//         try {
//             const repository = await this.getRepository();
//             const employees = await repository.findAll();
//
//             logger.info('📋 Fetched all employees from database', { count: employees.length });
//
//             // Конвертируем в нашу схему если нужно
//             return employees.map(emp => ({
//                 _id: emp._id?.toString(),
//                 externalId: emp.externalId,
//                 Name: emp.Name,
//                 Grade: emp.Grade,
//                 Role: emp.Role,
//                 'JS, TS': emp['JS, TS'],
//                 'Java': emp['Java'],
//                 'Python': emp['Python'],
//                 'C#': emp['C#'],
//                 'Kotlin': emp['Kotlin'],
//                 'Ruby': emp['Ruby'],
//                 'Swift': emp['Swift'],
//                 'Performance': emp['Performance'],
//                 'Security': emp['Security'],
//                 'Accessibility': emp['Accessibility'],
//                 'Testing Framework': emp['Testing Framework'],
//                 'English': emp['English'],
//                 'German': emp['German'],
//                 'Polish': emp['Polish'],
//                 'Country': emp['Country'],
//                 'City': emp['City'],
//                 'Team Lead': emp['Team Lead']
//             }));
//         } catch (error) {
//             logger.error('❌ Failed to fetch all employees:', error);
//             throw error;
//         }
//     }
//
//     async searchEmployees(criteria: EmployeeSearchCriteria): Promise<Employee[]> {
//         try {
//             const repository = await this.getRepository();
//             // Пока просто возвращаем всех - поиск реализуем позже
//             const allEmployees = await this.getAllEmployees();
//
//             logger.info('🔍 Search employees (basic implementation)', { criteria });
//
//             // Базовая фильтрация по грейдам если указаны
//             if (criteria.grades && criteria.grades.length > 0) {
//                 return allEmployees.filter(emp => criteria.grades!.includes(emp.Grade));
//             }
//
//             return allEmployees;
//         } catch (error) {
//             logger.error('❌ Failed to search employees:', error);
//             throw error;
//         }
//     }
//
//     async getEmployeeById(id: string): Promise<Employee | null> {
//         try {
//             const repository = await this.getRepository();
//             const employee = await repository.findById(id);
//
//             if (!employee) {
//                 return null;
//             }
//
//             logger.info('👤 Found employee by ID', { id, name: employee.Name });
//
//
//             return {
//                 _id: employee._id?.toString(),
//                 externalId: employee.externalId,
//                 Name: employee.Name,
//                 Grade: employee.Grade,
//                 Role: employee.Role,
//                 'JS, TS': employee['JS, TS'],
//                 'Java': employee['Java'],
//                 'Python': employee['Python'],
//                 'C#': employee['C#'],
//                 'Kotlin': employee['Kotlin'],
//                 'Ruby': employee['Ruby'],
//                 'Swift': employee['Swift'],
//                 'Performance': employee['Performance'],
//                 'Security': employee['Security'],
//                 'Accessibility': employee['Accessibility'],
//                 'Testing Framework': employee['Testing Framework'],
//                 'English': employee['English'],
//                 'German': employee['German'],
//                 'Polish': employee['Polish'],
//                 'Country': employee['Country'],
//                 'City': employee['City'],
//                 'Team Lead': employee['Team Lead']
//             };
//         } catch (error) {
//             logger.error('❌ Failed to get employee by ID:', error);
//             throw error;
//         }
//     }
//
//     async getEmployeeByExternalId(externalId: string): Promise<Employee | null> {
//         try {
//             const repository = await this.getRepository();
//             const employee = await repository.findByExternalId(externalId);
//
//             if (!employee) {
//                 return null;
//             }
//
//             logger.info('👤 Found employee by external ID', { externalId, name: employee.Name });
//
//             return {
//                 _id: employee._id?.toString(),
//                 externalId: employee.externalId,
//                 Name: employee.Name,
//                 Grade: employee.Grade,
//                 Role: employee.Role,
//                 'JS, TS': employee['JS, TS'],
//                 'Java': employee['Java'],
//                 'Python': employee['Python'],
//                 'C#': employee['C#'],
//                 'Kotlin': employee['Kotlin'],
//                 'Ruby': employee['Ruby'],
//                 'Swift': employee['Swift'],
//                 'Performance': employee['Performance'],
//                 'Security': employee['Security'],
//                 'Accessibility': employee['Accessibility'],
//                 'Testing Framework': employee['Testing Framework'],
//                 'English': employee['English'],
//                 'German': employee['German'],
//                 'Polish': employee['Polish'],
//                 'Country': employee['Country'],
//                 'City': employee['City'],
//                 'Team Lead': employee['Team Lead']
//             };
//         } catch (error) {
//             logger.error('❌ Failed to get employee by external ID:', error);
//             throw error;
//         }
//     }
//
//     private async getRepository(): Promise<EmployeeRepository> {
//         if (!this.employeeRepository) {
//             try {
//                 const db = await MongoDBClient.getClient();
//                 this.employeeRepository = new EmployeeRepository(db);
//                 logger.debug('✅ DatabaseEmployeeAdapter initialized');
//             } catch (error) {
//                 logger.error('💥 Failed to initialize DatabaseEmployeeAdapter:', error);
//                 throw new Error(`Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
//             }
//         }
//         return this.employeeRepository;
//     }
// }
