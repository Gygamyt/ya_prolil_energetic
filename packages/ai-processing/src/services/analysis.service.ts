import { logger } from '@repo/logger/src';
import { Employee } from '@repo/shared/src/schemas';
import { GeminiEmployeeAgent } from '../agents/gemini.agent.js';
import { TeamAnalysisPrompts } from '../prompts/team-analysis.prompts.js';
import {
    AnalysisRequest,
    TeamAnalysisResult,
    TeamStats,
    EmployeeProfileAnalysisRequest
} from '../types/analysis.types.js';

export class AnalysisService {
    private agent: GeminiEmployeeAgent;

    constructor() {
        this.agent = new GeminiEmployeeAgent();
    }

    /**
     * Анализ команды - основной метод
     */
    async analyzeTeam(employees: Employee[], context?: Record<string, any>): Promise<TeamAnalysisResult> {
        const startTime = Date.now();

        try {
            logger.info('🔥 Starting team analysis service', {
                employeeCount: employees.length,
                hasContext: !!context
            });

            // Вычисляем статистику
            const stats = this.calculateTeamStats(employees);

            // Генерируем промпт
            const prompt = TeamAnalysisPrompts.generateTeamAnalysisPrompt(stats);

            logger.info('📤 Generated analysis prompt', {
                promptLength: prompt.length,
                statsKeys: Object.keys(stats)
            });

            // Получаем анализ от AI
            const analysis = await this.agent.generateAnalysis(prompt);

            const duration = Date.now() - startTime;

            const result: TeamAnalysisResult = {
                success: true,
                analysis,
                stats,
                duration,
                timestamp: new Date().toISOString()
            };

            logger.info('✅ Team analysis completed', {
                duration,
                analysisLength: analysis.length,
                success: true
            });

            return result;

        } catch (error) {
            const duration = Date.now() - startTime;

            logger.error('💥 Team analysis failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                duration,
                employeeCount: employees.length
            });

            throw new Error(`Team analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * TODO: Анализ отдельного сотрудника с личностными характеристиками
     */
    async analyzeEmployee(request: EmployeeProfileAnalysisRequest): Promise<any> {
        logger.info('🔄 Employee analysis not implemented yet', {
            employeeId: request.targetEmployeeId,
            hasPersonalityTraits: !!request.personalityTraits
        });

        throw new Error('Employee analysis will be implemented when personality traits are added');
    }

    /**
     * Универсальный метод анализа
     */
    async analyze(request: AnalysisRequest): Promise<any> {
        switch (request.type) {
            case 'team-analysis':
                return this.analyzeTeam(request.employees, request.context);

            case 'employee-profile':
                return this.analyzeEmployee(request as EmployeeProfileAnalysisRequest);

            case 'skill-assessment':
                // TODO: Реализовать анализ навыков
                throw new Error('Skill assessment analysis not implemented yet');

            default:
                throw new Error(`Unknown analysis type: ${request.type}`);
        }
    }

    private calculateTeamStats(employees: Employee[]): TeamStats {
        logger.debug('🧮 Calculating team statistics');

        const grades: Record<string, number> = {};
        const roles: Record<string, number> = {};
        const topSkills: Record<string, number> = {};
        const locations: Record<string, number> = {};

        employees.forEach(emp => {
            grades[emp.Grade] = (grades[emp.Grade] || 0) + 1;
            roles[emp.Role] = (roles[emp.Role] || 0) + 1;

            const location = `${emp.City}, ${emp.Country}`;
            locations[location] = (locations[location] || 0) + 1;
        });

        const skills = ['JS, TS', 'Java', 'Python', 'C#', 'Kotlin', 'Ruby', 'Swift'];
        skills.forEach(skill => {
            const highCount = employees.filter(emp => emp[skill as keyof Employee] === 'High').length;
            if (highCount > 0) {
                topSkills[skill] = highCount;
            }
        });

        return {
            total: employees.length,
            grades,
            roles,
            topSkills,
            locations
        };
    }
}
