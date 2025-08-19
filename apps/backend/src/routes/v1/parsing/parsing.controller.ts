import { ParseSalesforceInput, ParseConfigQuery, MatchEmployeesInput } from './parsing.schemas';
import type { ParseConfig, ParseStrategy } from "@repo/ai-processing/src/types/request.types";
import { StandardParser } from "@repo/ai-processing/src/parsers/standard.parser";
import { getAllEmployeesHandler } from "@app/routes/v1/employees/employees.controller";
import type { CleanEmployeeObject } from "@repo/database/src/collections/collections";

const defaultConfig: ParseConfig = {
    aiProvider: 'gemini' as const, // 🔧 FIX: as const для типа
    confidenceThreshold: 0.6,
    fallbackStrategy: 'flexible' as const, // 🔧 FIX: as const
    enableCaching: true
};

export const parseSalesforceHandler = async (data: unknown) => {
    const input = ParseSalesforceInput.parse(data);

    const finalConfig: ParseConfig = {
        aiProvider: defaultConfig.aiProvider,
        confidenceThreshold: input.config?.confidenceThreshold ?? defaultConfig.confidenceThreshold,
        fallbackStrategy: input.config?.fallbackStrategy as ParseStrategy ?? defaultConfig.fallbackStrategy,
        enableCaching: input.config?.enableCaching ?? defaultConfig.enableCaching
    };

    const parser = new StandardParser(finalConfig);

    const startTime = Date.now();
    const parseResult = await parser.parseWithCache(input.input);
    const totalTime = Date.now() - startTime;

    return {
        parseResult,
        metadata: {
            totalTime,
            inputLength: input.input.length,
            config: finalConfig,
            timestamp: new Date().toISOString(),
            cached: parseResult.metadata?.fromCache || false,
            cacheHit: parseResult.metadata?.cacheHit || false
        }
    };
};

export const getParsingConfigHandler = async (query: unknown) => {
    const searchQuery = ParseConfigQuery.parse(query);

    return {
        defaultConfig,
        supportedOptions: {
            aiProvider: ['gemini'],
            confidenceThreshold: {
                min: 0,
                max: 1,
                default: 0.6
            },
            fallbackStrategy: ['flexible', 'strict', 'hybrid'],
            enableCaching: {
                type: 'boolean',
                default: true
            }
        }
    };
};

export const getParsingHealthHandler = async () => {
    return {
        service: 'StandardParser',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        config: {
            confidenceThreshold: defaultConfig.confidenceThreshold,
            aiProvider: defaultConfig.aiProvider
        }
    };
};

export const matchEmployeesHandler = async (data: unknown) => {
    const input = MatchEmployeesInput.parse(data);

    const employees: CleanEmployeeObject[] = await getAllEmployeesHandler({});

    console.log(`📋 Got ${employees.length} employees from database`);
    console.log(`🎯 Matching against requirements:`, JSON.stringify(input.parsedRequirements, null, 2));

    const matches = employees.map(employee => {
        const { totalScore, breakdown } = calculateAdvancedScore(employee, input.parsedRequirements);

        return {
            employee: {
                id: employee.externalId,
                name: employee.Name,
                grade: employee.Grade,
                role: employee.Role,
                country: employee.Country,
                city: employee.City,
                teamLead: employee['Team Lead'],
                skills: {
                    'JS/TS': employee['JS, TS'],
                    'Java': employee.Java,
                    'Python': employee.Python,
                    'Testing': employee['Testing Framework']
                },
                languages: {
                    English: employee.English,
                    German: employee.German,
                    Polish: employee.Polish
                }
            },
            score: totalScore,
            percentage: Math.round((totalScore / 100) * 100),
            breakdown,
            reasoning: generateDetailedReasoning(breakdown)
        };
    })
        .filter(match => match.score >= 20)
        .sort((a, b) => b.score - a.score)
        .slice(0, input.config?.maxResults || 10);

    return {
        matches,
        metadata: {
            totalEmployees: employees.length,
            matchedEmployees: matches.length,
            matchingStrategy: 'advanced',
            averageScore: matches.length > 0
                ? Math.round(matches.reduce((sum, m) => sum + m.score, 0) / matches.length)
                : 0,
            timestamp: new Date().toISOString()
        }
    };
};

function generateReasoning(breakdown: any): string {
    const reasons = [];

    if (breakdown.level.match) reasons.push(`✅ Level requirement met`);
    if (breakdown.experience.score === breakdown.experience.max) reasons.push(`✅ Experience requirement met`);
    if (breakdown.languages.matches.length > 0) reasons.push(`✅ Language skills: ${breakdown.languages.matches.join(', ')}`);
    if (breakdown.location.match) reasons.push(`✅ Location compatible`);
    if (breakdown.skills.matches.length > 0) reasons.push(`✅ Relevant skills: ${breakdown.skills.matches.join(', ')}`);

    return reasons.length > 0 ? reasons.join('\n') : 'Basic compatibility assessment';
}

function calculateAdvancedScore(employee: any, requirements: any): {
    totalScore: number;
    breakdown: {
        level: { score: number; max: number; match: boolean; details: string };
        experience: { score: number; max: number; details: string };
        languages: { score: number; max: number; matches: string[] };
        location: { score: number; max: number; match: boolean; details: string };
        skills: { score: number; max: number; matches: string[] };
    };
} {
    const breakdown = {
        level: { score: 0, max: 25, match: false, details: '' },
        experience: { score: 0, max: 30, details: '' },
        languages: { score: 0, max: 25, matches: [] },
        location: { score: 0, max: 10, match: false, details: '' },
        skills: { score: 0, max: 10, matches: [] }
    };

    // 1. 🎯 Проверяем уровень (Grade matching)
    if (requirements.levels && requirements.levels.length > 0) {
        const employeeGrade = employee.Grade; // Intern, Junior, Middle, Senior, No
        const levelMap = { 'Intern': 0, 'Junior': 1, 'Middle': 2, 'Senior': 3 };

        // @ts-ignore
        const reqLevels = requirements.levels.map(l => levelMap[l] || 0);
        // @ts-ignore
        const empLevel = levelMap[employeeGrade] || 0;

        if (empLevel > 0 && reqLevels.some((reqLevel: number) => empLevel >= reqLevel)) {
            breakdown.level.score = breakdown.level.max;
            breakdown.level.match = true;
            breakdown.level.details = `Employee: ${employeeGrade}, Required: ${requirements.levels.join(', ')}`;
        } else {
            breakdown.level.details = `Employee: ${employeeGrade}, Required: ${requirements.levels.join(', ')} - No match`;
        }
    } else {
        breakdown.level.score = breakdown.level.max / 2;
        breakdown.level.details = 'No level requirements specified';
    }

    // 2. 💼 Проверяем опыт
    const employeeYears = extractExperienceFromEmployee(employee);
    if (requirements.experience?.minTotalYears) {
        const requiredYears = requirements.experience.minTotalYears;

        if (employeeYears >= requiredYears) {
            breakdown.experience.score = breakdown.experience.max;
            breakdown.experience.details = `${employeeYears}+ years (required: ${requiredYears}) ✅`;
        } else {
            const ratio = employeeYears / requiredYears;
            breakdown.experience.score = Math.round(breakdown.experience.max * ratio);
            breakdown.experience.details = `${employeeYears} years (required: ${requiredYears}) - ${Math.round(ratio * 100)}% match`;
        }
    } else {
        breakdown.experience.score = breakdown.experience.max;
        breakdown.experience.details = `Estimated: ${employeeYears} years (no specific requirement)`;
    }

    // 3. 🗣️ Проверяем языки
    if (requirements.languageRequirements && requirements.languageRequirements.length > 0) {
        const employeeLanguages = extractLanguagesFromEmployee(employee);
        let languageScore = 0;
        const matches = [];

        for (const reqLang of requirements.languageRequirements) {
            const empLang = employeeLanguages.find(el =>
                el.language.toLowerCase() === reqLang.language.toLowerCase()
            );

            if (empLang && compareLanguageLevels(empLang.level, reqLang.level) >= 0) {
                const priority = reqLang.priority;
                const scoreWeight = priority === 'required' ? 10 : priority === 'preferred' ? 7 : 4;
                languageScore += scoreWeight;
                matches.push(`${reqLang.language}: ${empLang.level} (required: ${reqLang.level}) ✅`);
            } else if (empLang) {
                matches.push(`${reqLang.language}: ${empLang.level} (required: ${reqLang.level}) ❌`);
            } else {
                matches.push(`${reqLang.language}: Not specified (required: ${reqLang.level}) ❌`);
            }
        }

        breakdown.languages.score = Math.min(languageScore, breakdown.languages.max);
        // @ts-ignore
        breakdown.languages.matches = matches;
    } else {
        breakdown.languages.score = breakdown.languages.max;
        // @ts-ignore
        breakdown.languages.matches = ['No language requirements specified'];
    }

    // 4. 📍 Проверяем локацию
    if (requirements.location) {
        const employeeCountry = employee.Country || '';
        const employeeCity = employee.City || '';
        const workType = requirements.location.workType;

        let locationMatch = false;
        let locationDetails = '';

        if (requirements.location.regions && requirements.location.regions.length > 0) {
            locationMatch = requirements.location.regions.some((region: string) =>
                isCountryInRegion(employeeCountry, region)
            );
            locationDetails = `Employee: ${employeeCountry}${employeeCity ? ', ' + employeeCity : ''}, Regions: ${requirements.location.regions.join(', ')}`;
        }

        if (workType === 'Remote' || locationMatch) {
            breakdown.location.score = breakdown.location.max;
            breakdown.location.match = true;
            breakdown.location.details = locationDetails + ' ✅';
        } else {
            breakdown.location.details = locationDetails + ' ❌';
        }
    } else {
        breakdown.location.score = breakdown.location.max;
        breakdown.location.match = true;
        breakdown.location.details = 'No location requirements specified';
    }

    // 5. 🛠️ Проверяем навыки
    const employeeSkills = extractSkillsFromEmployee(employee);
    const requiredSkills = requirements.skills?.required || [];
    const preferredSkills = requirements.skills?.preferred || [];

    const skillMatches = [];
    let skillScore = 0;

    // Проверяем обязательные навыки
    requiredSkills.forEach((skill: string) => {
        const hasSkill = employeeSkills.some(empSkill =>
            empSkill.includes(skill.toLowerCase()) || skill.toLowerCase().includes(empSkill)
        );
        if (hasSkill) {
            skillScore += 3;
            skillMatches.push(`Required: ${skill} ✅`);
        } else {
            skillMatches.push(`Required: ${skill} ❌`);
        }
    });

    // Проверяем предпочтительные навыки
    preferredSkills.forEach((skill: string) => {
        const hasSkill = employeeSkills.some(empSkill =>
            empSkill.includes(skill.toLowerCase()) || skill.toLowerCase().includes(empSkill)
        );
        if (hasSkill) {
            skillScore += 1;
            skillMatches.push(`Preferred: ${skill} ✅`);
        }
    });

    // Если нет требований по навыкам, даем базовый балл
    if (requiredSkills.length === 0 && preferredSkills.length === 0) {
        skillScore = breakdown.skills.max;
        skillMatches.push(`Employee skills: ${employeeSkills.slice(0, 5).join(', ')}${employeeSkills.length > 5 ? '...' : ''}`);
    }

    breakdown.skills.score = Math.min(skillScore, breakdown.skills.max);
    // @ts-ignore
    breakdown.skills.matches = skillMatches;

    const totalScore = Object.values(breakdown).reduce((sum, item) => sum + item.score, 0);

    return { totalScore, breakdown };
}

// 🔧 Helper functions


function extractExperienceFromEmployee(employee: any): number {
    // Угадываем опыт по Grade (из схемы: Intern, Junior, Middle, Senior, No)
    const gradeExperienceMap = {
        'Intern': 0.5,
        'Junior': 2,
        'Middle': 4,
        'Senior': 7,
        'No': 3 // Дефолтное значение
    };

    // @ts-ignore
    return gradeExperienceMap[employee.Grade] || 3;
}

function extractLanguagesFromEmployee(employee: any): Array<{ language: string, level: string }> {
    const languages = [];

    // Извлекаем языки из схемы (English, German, Polish)
    if (employee.English && employee.English !== 'No') {
        languages.push({
            language: 'English',
            level: employee.English // A1, A2, B1, B2, C1, C2
        });
    }

    if (employee.German && employee.German !== 'No') {
        languages.push({
            language: 'German',
            level: employee.German
        });
    }

    if (employee.Polish && employee.Polish !== 'No') {
        languages.push({
            language: 'Polish',
            level: employee.Polish
        });
    }

    return languages;
}

function compareLanguageLevels(empLevel: string, reqLevel: string): number {
    const levels = {
        'A1': 1, 'A2': 2, 'B1': 3, 'B2': 4, 'C1': 5, 'C2': 6,
        'Native': 7, 'C2+': 7
    };
    // @ts-ignore
    return (levels[empLevel] || 0) - (levels[reqLevel] || 0);
}

function isCountryInRegion(country: string, region: string): boolean {
    const regions = {
        'EU': ['Belarus', 'Poland', 'Germany', 'France', 'Spain', 'Italy', 'Netherlands', 'Czech Republic'],
        'US': ['United States', 'USA'],
        'APAC': ['Singapore', 'Australia', 'Japan', 'India'],
        'CIS': ['Belarus', 'Russia', 'Ukraine', 'Kazakhstan']
    };

    // @ts-ignore
    return regions[region]?.some(r =>
        country?.toLowerCase().includes(r.toLowerCase()) ||
        r.toLowerCase().includes(country?.toLowerCase())
    ) || false;
}

function extractSkillsFromEmployee(employee: any): string[] {
    const skills = [];

    // Извлекаем технические навыки из схемы
    const techSkills = [
        'JS, TS', 'Java', 'Python', 'C#', 'Kotlin',
        'Ruby', 'Swift', 'Performance', 'Security', 'Accessibility'
    ];

    techSkills.forEach(skill => {
        const level = employee[skill];
        if (level && level !== 'No') {
            // Добавляем навык с уровнем
            skills.push(`${skill.toLowerCase()}:${level.toLowerCase()}`);

            // Также добавляем просто навык для базового поиска
            if (skill === 'JS, TS') {
                skills.push('javascript', 'typescript', 'js', 'ts');
            } else {
                skills.push(skill.toLowerCase());
            }
        }
    });

    // Добавляем роль как навык
    if (employee.Role) {
        skills.push(employee.Role.toLowerCase());
    }

    // Добавляем фреймворк тестирования если есть
    if (employee['Testing Framework']) {
        skills.push(employee['Testing Framework'].toLowerCase());
    }

    return skills;
}

function generateDetailedReasoning(breakdown: any): string {
    const reasons = [];

    if (breakdown.level.match) {
        reasons.push(`✅ ${breakdown.level.details}`);
    } else {
        reasons.push(`❌ ${breakdown.level.details}`);
    }

    reasons.push(`💼 Experience: ${breakdown.experience.details}`);

    if (breakdown.languages.matches.length > 0) {
        reasons.push(`🗣️ Languages: ${breakdown.languages.matches.join(', ')}`);
    }

    reasons.push(`📍 Location: ${breakdown.location.details}`);

    if (breakdown.skills.matches.length > 0) {
        reasons.push(`🛠️ Skills: ${breakdown.skills.matches.join(', ')}`);
    }

    return reasons.join('\n');
}
