import { BaseParser } from "./base.parser";
import { ClientRequest, LanguageLevel, LanguageRequirement, ParseConfig, ParseResult, RoleExperience, SupportedLanguage } from "../types/request.types";

export class StandardParser extends BaseParser {
    constructor(config: ParseConfig) {
        super(config);
    }

    async parse(input: string): Promise<ParseResult> {
        try {
            const extractedFields: string[] = [];
            const data: Partial<ClientRequest> = {
                rawInput: input,
                parseStrategy: 'standard',
                status: 'pending',
                createdAt: new Date()
            };

            const levels = this.extractLevelsFromSalesforce(input);
            if (levels && levels.length > 0) {
                data.levels = levels;
                extractedFields.push('levels');
            }

            const languageRequirements = this.extractLanguageRequirementsFromSalesforce(input);
            if (languageRequirements && languageRequirements.length > 0) {
                data.languageRequirements = languageRequirements.map(req => ({
                    language: req.language,
                    level: req.level,
                    modifier: req.modifier,
                    priority: req.priority
                }));
                extractedFields.push('languageRequirements');
            }

            const teamSize = this.extractTeamSizeFromSalesforce(input);
            if (teamSize !== undefined && !isNaN(teamSize)) {
                data.teamSize = Number(teamSize);
                extractedFields.push('teamSize');
            }

            const location = this.extractLocationFromSalesforce(input);
            if (location) {
                data.location = {
                    regions: location.regions,
                    workType: location.workType,
                    timezone: location.timezone,
                    additionalRequirements: location.additionalRequirements
                };
                extractedFields.push('location');
            }

            const roleAndRequirements = this.extractRoleAndRequirements(input);
            if (roleAndRequirements.role) {
                data.role = String(roleAndRequirements.role);
                data.responsibilities = String(roleAndRequirements.responsibilities);
                extractedFields.push('role', 'responsibilities');
            }

            const experience = this.extractExperienceFromSalesforce(input);
            if (experience !== undefined) {
                data.experience = {
                    minTotalYears: experience.minTotalYears ? Number(experience.minTotalYears) : undefined,
                    leadershipRequired: Boolean(experience.leadershipRequired),
                    leadershipYears: experience.leadershipYears ? Number(experience.leadershipYears) : undefined,
                    roleExperience: experience.roleExperience ? experience.roleExperience.map(re => ({
                        role: String(re.role),
                        years: Number(re.years),
                        source: String(re.source),
                        requirements: re.requirements ? re.requirements.map(r => String(r)) : undefined
                    })) : undefined
                };
                extractedFields.push('experience');
            }

            const metadata = this.extractMetadata(input);
            if (metadata.salesManager) {
                data.salesManager = String(metadata.salesManager);
                extractedFields.push('salesManager');
            }
            if (metadata.coordinator) {
                data.coordinator = String(metadata.coordinator);
                extractedFields.push('coordinator');
            }
            if (metadata.deadline) {
                data.deadline = new Date(metadata.deadline);
                extractedFields.push('deadline');
            }
            if (metadata.industry) {
                data.industry = String(metadata.industry);
                extractedFields.push('industry');
            }

            const confidence = this.calculateConfidence(extractedFields, input);

            return {
                success: confidence > this.config.confidenceThreshold,
                data,
                confidence: Number(confidence),
                strategy: 'standard',
                extractedFields: [...extractedFields]
            };

        } catch (error) {
            console.error('StandardParser error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown parsing error',
                confidence: 0,
                strategy: 'standard',
                extractedFields: []
            };
        }
    }

    private extractLevelsFromSalesforce(text: string): string[] {
        const patterns = [
            /6\.\s*Уровень разработчиков\s*\n?(.+)/i,
            /уровень\s*[:\-]?\s*(junior\+?|middle\+?|senior\+?|lead)[\+;,\s]*(junior\+?|middle\+?|senior\+?|lead)?/gi
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                const levelText = match[1] || match[0];
                return this.extractLevels(levelText);
            }
        }

        return [];
    }


    private extractLanguageRequirementsFromSalesforce(text: string): LanguageRequirement[] {
        const patterns = [
            /8\.\s*Min уровень английского языка\s*\n?(.+)/i,
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                const langText = match[1].trim();

                if (langText.includes(',') || langText.includes('Spanish') || langText.includes('German')) {
                    return this.parseComplexLanguageRequirements(langText);
                }

                // Простой случай "B2"
                if (/^[ABC][12][\+\-]?$/.test(langText)) {
                    let modifier: "+" | "-" | undefined = undefined;
                    if (langText.includes('+')) {
                        modifier = '+';
                    } else if (langText.includes('-')) {
                        modifier = '-';
                    }

                    return [{
                        language: 'English' as SupportedLanguage,
                        level: langText.replace(/[\+\-]/g, '') as LanguageLevel,
                        modifier,
                        priority: 'required' as const
                    }];
                }

                return this.extractLanguageRequirements(langText);
            }
        }

        return [];
    }

    private parseComplexLanguageRequirements(text: string): LanguageRequirement[] {
        const requirements: LanguageRequirement[] = [];

        const patterns = [
            /([ABC][12])(\+|\-?)\s+(English|Spanish|German|French|Polish|Russian|Ukrainian|Czech|Portuguese|Italian|Dutch)\s+(required|mandatory)/gi,
            /(English|Spanish|German|French|Polish|Russian|Ukrainian|Czech|Portuguese|Italian|Dutch)\s+([ABC][12])(\+|\-?)\s+(preferred|would be|nice)/gi,
            /([ABC][12])(\+|\-?)\s+(English|Spanish|German|French|Polish|Russian|Ukrainian|Czech|Portuguese|Italian|Dutch)/gi,
            /(English|Spanish|German|French|Polish|Russian|Ukrainian|Czech|Portuguese|Italian|Dutch)\s+([ABC][12])(\+|\-?)/gi
        ];

        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                let language: string;
                let level: string;
                let modifier: string | undefined;
                let priority: "required" | "preferred" | "nice-to-have";

                if (match[3]) {
                    level = match[1];
                    modifier = match[2] || undefined;
                    language = match[3];
                    priority = match[4]?.toLowerCase().includes('required') ? 'required' : 'preferred';
                } else {
                    language = match[1];
                    level = match[2];
                    modifier = match[3] || undefined;
                    priority = match[4]?.toLowerCase().includes('preferred') ? 'preferred' :
                        match[4]?.toLowerCase().includes('nice') ? 'nice-to-have' : 'required';
                }

                const normalizedLanguage = this.normalizeLanguage(language);
                const normalizedLevel = this.normalizeLanguageLevel(level);

                if (normalizedLanguage && normalizedLevel) {
                    requirements.push({
                        language: normalizedLanguage,
                        level: normalizedLevel,
                        modifier: modifier === '+' ? '+' : modifier === '-' ? '-' : undefined,
                        priority
                    });
                }
            }
        });

        if (requirements.length === 0) {
            return this.extractLanguageRequirements(text);
        }

        return this.deduplicateLanguages(requirements);
    }

    private extractTeamSizeFromSalesforce(text: string): number | undefined {
        const patterns = [
            /12\.\s*Запрошенное количество сотрудников\s*\n?(\d+)/i,
            /количество\s*[:\-]?\s*(\d+)/i,
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                return parseInt(match[1]);
            }
        }

        return undefined;
    }


    private extractLocationFromSalesforce(text: string) {
        const patterns = [
            /24\.\s*Требуемая локация специалиста.*?\n(.+?)(?=\n\d+\.|$)/is, // точное поле 24
        ];

        let regions: string[] = [];
        let timezone: string | undefined;
        let workType: "Remote" | "Office" | "Hybrid" | undefined;
        let additionalRequirements: string | undefined;

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                const locationText = match[1] || match[0];

                if (locationText.toLowerCase().includes('remote')) {
                    workType = 'Remote';
                } else if (locationText.toLowerCase().includes('office')) {
                    workType = 'Office';
                } else if (locationText.toLowerCase().includes('hybrid')) {
                    workType = 'Hybrid';
                }

                const regionMatches = locationText.match(/(EU|US|BY|PL|UA|CZ|EMEA|APAC)/gi);
                if (regionMatches) {
                    regions = [...new Set(regionMatches.map(r => r.toUpperCase()))];
                }

                const timezoneMatch = locationText.match(/(EST|CET|GMT|PST|MST|CST)[\+\-]?\d*/i);
                if (timezoneMatch) {
                    timezone = timezoneMatch[0].toUpperCase();
                }

                if (locationText.includes('until') || locationText.includes('alignment') || locationText.includes('Central')) {
                    additionalRequirements = locationText.trim();
                }

                break;
            }
        }

        if (regions.length > 0 || timezone || workType || additionalRequirements) {
            return {
                regions: regions.length > 0 ? regions : undefined,
                timezone,
                workType,
                additionalRequirements
            };
        }

        return undefined;
    }

    private extractRoleAndRequirements(text: string) {
        const patterns = [
            /14\.\s*Подробные требования к разработчику\s*\n?([\s\S]*?)(?=\n\d+\.|$)/i,
            /33\.\s*Первичный запрос\s*\n?([\s\S]*?)(?=\n\d+\.|$)/i
        ];

        let role = '';
        let responsibilities = '';

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                const requirementText = match[1].trim();

                const firstLine = requirementText.split('\n')[0];
                const roleMatch = firstLine.match(/(Senior|Middle|Junior|Lead)?\s*(QA|Quality Assurance|Test|Backend|Frontend|Fullstack|Full-stack|Developer|Engineer)/i);
                if (roleMatch) {
                    role = firstLine.trim();
                }

                responsibilities = requirementText;
                break;
            }
        }

        return { role, responsibilities };
    }

    private extractExperienceFromSalesforce(text: string) {
        const roleExperience: RoleExperience[] = [];

        const totalYears = this.extractExperienceYears(text);

        const field14Match = text.match(/14\.\s*Подробные требования к разработчику\s*\n?([\s\S]*?)(?=\n\d+\.|$)/i);
        if (field14Match) {
            const field14Text = field14Match[1];
            const roleExperienceFromField14 = this.extractRoleExperience(field14Text, 'field_14');
            roleExperience.push(...roleExperienceFromField14);
        }

        const field33Match = text.match(/33\.\s*Первичный запрос\s*\n?([\s\S]*?)(?=\n\d+\.|$)/i);
        if (field33Match) {
            const field33Text = field33Match[1];
            const roleExperienceFromField33 = this.extractRoleExperience(field33Text, 'field_33');
            roleExperience.push(...roleExperienceFromField33);
        }

        const leadershipPattern = /(\d+)[\+]?\s*years?\s*(?:in\s*)?(?:leadership|lead|management|mentoring)/gi;
        const leadershipMatch = text.match(leadershipPattern);
        const leadershipYears = leadershipMatch ? parseInt(leadershipMatch[0]) : undefined;

        const leadershipRequired = text.toLowerCase().includes('lead') ||
            text.toLowerCase().includes('leadership') ||
            text.toLowerCase().includes('mentor');

        if (!totalYears && !leadershipYears && !leadershipRequired && roleExperience.length === 0) {
            return undefined;
        }

        return {
            minTotalYears: totalYears,
            leadershipRequired,
            leadershipYears,
            roleExperience: roleExperience.length > 0 ? roleExperience : undefined
        };
    }

    private extractRoleExperience(text: string, source: 'field_14' | 'field_33'): RoleExperience[] {
        console.log('Extracting role experience from:', source, 'Text:', text.substring(0, 100) + '...');

        const experiences: RoleExperience[] = [];

        const rolePatterns = [
            /(Lead|Senior|Middle|Junior)?\s*(QA|Quality Assurance|Test|Backend|Frontend|Fullstack|Developer|Engineer)[^.]*?with\s+(\d+)\+?\s*years/gi,
            /(\d+)\+?\s*years?[^.]*?(?:as|in)\s*(QA|Quality Assurance|Test|Backend|Frontend|Lead|Senior)/gi,
            /(Lead|Senior|Middle|Junior)?\s*(QA|Quality Assurance|Test|Backend|Frontend|Developer|Engineer)[^.]*?[-–]\s*(\d+)\+?\s*years/gi
        ];

        rolePatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                let role: string;
                let years: number;

                if (match[3]) {
                    role = `${match[1] || ''} ${match[2]}`.trim();
                    years = parseInt(match[3]);
                } else {
                    years = parseInt(match[1]);
                    role = match[2];
                }

                const requirements = this.extractRequirementsFromContext(text, match.index || 0);

                const experience: RoleExperience = {
                    role: String(role),
                    years: Number(years),
                    source: String(source),
                    requirements: requirements.length > 0 ? requirements.map(r => String(r)) : undefined
                };

                experiences.push(experience);
            }
        });
        return experiences;
    }

    private extractRequirementsFromContext(text: string, matchIndex: number): string[] {
        const contextStart = Math.max(0, matchIndex - 100);
        const contextEnd = Math.min(text.length, matchIndex + 200);
        const context = text.slice(contextStart, contextEnd);

        const requirements: string[] = [];

        const skillPatterns = [
            /leadership/gi,
            /mentoring/gi,
            /team\s+management/gi,
            /automation/gi,
            /testing/gi,
            /processes/gi
        ];

        skillPatterns.forEach(pattern => {
            if (pattern.test(context)) {
                const skill = pattern.source.replace(/\\s\+/g, ' ').replace(/[gi]/g, '');
                requirements.push(skill);
            }
        });

        return [...new Set(requirements)];
    }

    private extractMetadata(text: string) {
        const metadata: any = {};

        const industryMatch = text.match(/1\.\s*Индустрия проекта\s*\n?(.+)/i);
        if (industryMatch) {
            metadata.industry = industryMatch[1].trim();
        }

        const salesMatch = text.match(/22\.\s*Сейлс менеджер\s*\n?(.+)/i);
        if (salesMatch) {
            metadata.salesManager = salesMatch[1].trim();
        }

        const coordinatorMatch = text.match(/31\.\s*Проектный координатор\s*\n?(.+)/i);
        if (coordinatorMatch) {
            metadata.coordinator = coordinatorMatch[1].trim();
        }

        const deadlineMatch = text.match(/20\.\s*Срок отправки заказчику\s*\n?(.+)/i);
        if (deadlineMatch) {
            const dateStr = deadlineMatch[1].trim();
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
                metadata.deadline = date;
            }
        }

        return metadata;
    }

    private calculateConfidence(extractedFields: string[], input: string): number {
        const totalPossibleFields = ['levels', 'teamSize', 'languageRequirements', 'industry', 'location', 'experience', 'role', 'salesManager', 'coordinator', 'deadline'];

        const fieldRatio = extractedFields.length / Math.min(totalPossibleFields.length, 5); // максимум 5 полей для расчета
        const baseConfidence = Math.min(0.5, fieldRatio * 0.8); // макс 0.5 за поля

        const hasStructure = input.includes('6.') || input.includes('12.') || input.includes('8.');
        const structureBonus = hasStructure ? 0.3 : 0;

        const criticalFields = ['levels', 'teamSize'];
        const criticalFound = criticalFields.filter(field => extractedFields.includes(field)).length;
        const criticalBonus = (criticalFound / criticalFields.length) * 0.2;

        const lengthPenalty = input.trim().length < 50 ? -0.1 : 0;

        return Math.min(1.0, Math.max(0.0, baseConfidence + structureBonus + criticalBonus + lengthPenalty));
    }
}
