import { z } from 'zod';
import { logger } from '@repo/logger/src';
import { Employee, EmployeeSearchCriteria, EmployeeSearchCriteriaSchema } from "@repo/shared/src/schemas";

export interface EmployeeDataSource {
    getAllEmployees(): Promise<Employee[]>;
    searchEmployees(criteria: EmployeeSearchCriteria): Promise<Employee[]>;
    getEmployeeById(id: string): Promise<Employee | null>;
    getEmployeeByExternalId(externalId: string): Promise<Employee | null>;
}

export const searchEmployeesTool = {
    name: 'search_employees',
    description: 'Search for employees based on various criteria like skills, grade, role, location, etc.',
    parameters: z.object({
        criteria: EmployeeSearchCriteriaSchema.describe('Search criteria for finding employees')
    }),
    execute: async (params: { criteria: EmployeeSearchCriteria }, dataSource: EmployeeDataSource) => {
        try {
            logger.info('🔍 Searching employees with criteria', { criteria: params.criteria });

            const employees = await dataSource.searchEmployees(params.criteria);

            logger.info('✅ Employee search completed', {
                foundCount: employees.length,
                criteria: params.criteria
            });

            return {
                success: true,
                employees,
                totalFound: employees.length,
                criteria: params.criteria
            };
        } catch (error) {
            logger.error('❌ Employee search failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                criteria: params.criteria
            });

            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                employees: [],
                totalFound: 0
            };
        }
    }
};

export const getAllEmployeesTool = {
    name: 'get_all_employees',
    description: 'Get all employees in the database',
    parameters: z.object({}),
    execute: async (_params: {}, dataSource: EmployeeDataSource) => {
        try {
            logger.info('📋 Fetching all employees');

            const employees = await dataSource.getAllEmployees();

            logger.info('✅ All employees fetched', { totalCount: employees.length });

            return {
                success: true,
                employees,
                totalCount: employees.length
            };
        } catch (error) {
            logger.error('❌ Failed to fetch all employees', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });

            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                employees: [],
                totalCount: 0
            };
        }
    }
};

export const getEmployeeByIdTool = {
    name: 'get_employee_by_id',
    description: 'Get a specific employee by their database ID or external ID',
    parameters: z.object({
        id: z.string().describe('Employee ID (database _id or externalId)'),
        useExternalId: z.boolean().default(false).describe('Whether to search by external ID instead of database ID')
    }),
    execute: async (params: { id: string; useExternalId?: boolean }, dataSource: EmployeeDataSource) => {
        try {
            logger.info('👤 Fetching employee by ID', {
                id: params.id,
                useExternalId: params.useExternalId
            });

            const employee = params.useExternalId
                ? await dataSource.getEmployeeByExternalId(params.id)
                : await dataSource.getEmployeeById(params.id);

            if (employee) {
                logger.info('✅ Employee found', {
                    employeeName: employee.Name,
                    employeeId: params.id
                });

                return {
                    success: true,
                    employee,
                    found: true
                };
            } else {
                logger.warn('⚠️ Employee not found', { id: params.id });

                return {
                    success: true,
                    employee: null,
                    found: false,
                    message: `Employee with ID ${params.id} not found`
                };
            }
        } catch (error) {
            logger.error('❌ Failed to fetch employee', {
                error: error instanceof Error ? error.message : 'Unknown error',
                id: params.id
            });

            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                employee: null,
                found: false
            };
        }
    }
};

export const analyzeTeamSkillsTool = {
    name: 'analyze_team_skills',
    description: 'Analyze skills distribution and capabilities of a team or all employees',
    parameters: z.object({
        filterCriteria: EmployeeSearchCriteriaSchema.optional().describe('Optional criteria to filter employees for analysis')
    }),
    execute: async (params: { filterCriteria?: EmployeeSearchCriteria }, dataSource: EmployeeDataSource) => {
        try {
            logger.info('📊 Analyzing team skills', { filterCriteria: params.filterCriteria });

            const employees = params.filterCriteria
                ? await dataSource.searchEmployees(params.filterCriteria)
                : await dataSource.getAllEmployees();


            const skillsAnalysis = analyzeSkillsDistribution(employees);
            const gradeAnalysis = analyzeGradeDistribution(employees);
            const roleAnalysis = analyzeRoleDistribution(employees);
            const locationAnalysis = analyzeLocationDistribution(employees);

            const analysis = {
                totalEmployees: employees.length,
                skillsDistribution: skillsAnalysis,
                gradeDistribution: gradeAnalysis,
                roleDistribution: roleAnalysis,
                locationDistribution: locationAnalysis,
                insights: generateInsights(employees, skillsAnalysis, gradeAnalysis, roleAnalysis)
            };

            logger.info('✅ Team skills analysis completed', {
                totalEmployees: employees.length,
                skillCategories: Object.keys(skillsAnalysis).length
            });

            return {
                success: true,
                analysis
            };
        } catch (error) {
            logger.error('❌ Team skills analysis failed', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });

            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
};


function analyzeSkillsDistribution(employees: Employee[]) {
    const skills = ['JS, TS', 'Java', 'Python', 'C#', 'Kotlin', 'Ruby', 'Swift', 'Performance', 'Security', 'Accessibility'];
    const distribution: Record<string, Record<string, number>> = {};

    skills.forEach(skill => {
        distribution[skill] = { 'No': 0, 'Low': 0, 'Medium': 0, 'High': 0 };
        employees.forEach(emp => {
            const level = emp[skill as keyof Employee] as string;
            if (level in distribution[skill]) {
                distribution[skill][level]++;
            }
        });
    });

    return distribution;
}

function analyzeGradeDistribution(employees: Employee[]) {
    const distribution: Record<string, number> = { 'Junior': 0, 'Middle': 0, 'Senior': 0, 'Lead': 0 };

    employees.forEach(emp => {
        if (emp.Grade in distribution) {
            distribution[emp.Grade]++;
        }
    });

    return distribution;
}

function analyzeRoleDistribution(employees: Employee[]) {
    const distribution: Record<string, number> = {
        'Fullstack': 0, 'Frontend': 0, 'Backend': 0, 'Mobile': 0, 'DevOps': 0, 'QA': 0, 'AQA': 0
    };

    employees.forEach(emp => {
        if (emp.Role in distribution) {
            distribution[emp.Role]++;
        }
    });

    return distribution;
}

function analyzeLocationDistribution(employees: Employee[]) {
    const distribution: Record<string, number> = {};

    employees.forEach(emp => {
        const location = `${emp.City}, ${emp.Country}`;
        distribution[location] = (distribution[location] || 0) + 1;
    });

    return distribution;
}

function generateInsights(
    employees: Employee[],
    skillsDistribution: Record<string, Record<string, number>>,
    gradeDistribution: Record<string, number>,
    roleDistribution: Record<string, number>
): string[] {
    const insights: string[] = [];

    Object.entries(skillsDistribution).forEach(([skill, levels]) => {
        const highLevel = levels['High'] || 0;
        const total = Object.values(levels).reduce((sum, count) => sum + count, 0);
        const percentage = total > 0 ? (highLevel / total * 100).toFixed(1) : '0';

        if (highLevel > 0) {
            insights.push(`${percentage}% of team has high-level ${skill} skills (${highLevel}/${total} employees)`);
        }
    });

    const totalEmployees = Object.values(gradeDistribution).reduce((sum, count) => sum + count, 0);
    Object.entries(gradeDistribution).forEach(([grade, count]) => {
        if (count > 0) {
            const percentage = ((count / totalEmployees) * 100).toFixed(1);
            insights.push(`${percentage}% of team are ${grade} level (${count}/${totalEmployees} employees)`);
        }
    });

    Object.entries(roleDistribution).forEach(([role, count]) => {
        if (count > 0) {
            const percentage = ((count / totalEmployees) * 100).toFixed(1);
            insights.push(`${percentage}% of team work as ${role} (${count}/${totalEmployees} employees)`);
        }
    });

    return insights;
}
