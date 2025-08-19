import fs from 'node:fs';
import path from 'node:path';

import {
    RoleExtractionResult,
    RoleExtractionConfig,
    RolePattern,
    RoleExtractionStats
} from '../types';

export class RoleExtractor {
    /* ───────────────────────── Статистика (static) ───────────────────────── */
    private static stats: RoleExtractionStats = {
        totalAttempts: 0,
        success: 0,
        byMethod: { pattern: 0, keyword: 0, nlp: 0, fallback: 0 },
        topRoles: {}
    };

    /* ───────────────────────── Улучшенные паттерны (приоритет) ───────────────────────── */
    private readonly rolePatterns: RolePattern[] = [
        // === AUTOMATION QA ROLES (высший приоритет) ===
        { pattern: /mobile\s+app\s+test\s+automation\s+engineer/i, priority: 15 },
        { pattern: /(?:senior|lead)\s+qa\s+automation\s+engineer/i, priority: 14 },
        { pattern: /test\s+automation\s+engineer/i, priority: 13 },
        { pattern: /(?:qa|quality\s+assurance)\s+automation\s+engineer/i, priority: 12 },
        { pattern: /automation\s+qa\s+engineer/i, priority: 12 },
        { pattern: /(?:it\s+)?test\s+automation\s+engineer/i, priority: 11 },
        { pattern: /sdet/i, priority: 11 },

        // === MANUAL QA ROLES ===
        { pattern: /manual\s+qa\s+(?:engineer|tester)/i, priority: 10 },
        { pattern: /qa\s+manual\s+(?:engineer|tester)/i, priority: 10 },
        { pattern: /manual\s+tester/i, priority: 9 },
        { pattern: /qa\s*\/\s*manual\s+tester/i, priority: 9 },

        // === GENERAL QA ROLES (средний приоритет) ===
        { pattern: /(?:senior|lead)\s+(?:qa|quality\s+assurance)\s+engineer/i, priority: 8 },
        { pattern: /(?:hands-on\s+)?lead\s+qa\s+engineer/i, priority: 8 },
        { pattern: /senior\s+qa\s*\/\s*aqa/i, priority: 8 },
        { pattern: /quality\s+assurance\s+engineer/i, priority: 7 },
        { pattern: /(?:qa|quality)\s+(?:team\s+)?lead/i, priority: 7 },
        { pattern: /mobile\s+qa\s+tester/i, priority: 7 },
        { pattern: /(?:manual\s+)?qa\s+engineer/i, priority: 6 },
        { pattern: /qa\s+tester/i, priority: 5 },
        { pattern: /(?:api\s+)?test\s+engineer/i, priority: 5 },

        // === SPECIALIZED QA ROLES ===
        { pattern: /fullstack\s+qa\s+engineer/i, priority: 8 },
        { pattern: /qa\s+engineer\s+fullstack/i, priority: 8 },

        // === РУССКИЕ ПАТТЕРНЫ ===
        { pattern: /инженер\s+(?:по\s+)?автоматизации\s+тестирования/i, priority: 12 },
        { pattern: /aqa\s+java\s+инженер/i, priority: 11 },
        { pattern: /автоматизатор\s+тестирования/i, priority: 10 },
        { pattern: /функциональный\s+тестировщик/i, priority: 9 },
        { pattern: /(?:инженер|специалист)\s+(?:по\s+)?(?:тестированию|qa)/i, priority: 7 },
        { pattern: /qa\s+инженер/i, priority: 7 },
        { pattern: /тестировщик/i, priority: 6 },
    ];

    // --- Company noise ----------------------------------------------------------------
    private readonly companyNoise = [
        'AG', 'GMBH', 'LTD', 'INC', 'LLC', 'SIA', 'KG', 'SA', 'SPA',
        'Deutschland', 'Group', 'Groups', 'Holding', 'Software', 'Data',
        'Skillstaff', 'Gradeproai', 'Etengo', 'Hays', 'Propellerhead',
        'NTT', 'Cachengo', 'Sciencesoft', 'Stellium', 'Inmotion',
        'Whitespace', 'Xprtminds', 'Advascale', 'Quincey', 'Kanda',
        'InterVenture', 'Orangesoft', 'HiptechDev', 'Eurofins', 'UDDAN',
        'PROLOGA', 'ITSOFT', 'PURPLE BRICKS', 'Digiteum', 'Московская Биржа'
    ];

    /* ───────────────────────── Константы ───────────────────────── */
    private readonly roleKeywords = [
        // Английские
        'QA', 'AQA', 'Quality Assurance', 'Test', 'Testing', 'Automation',
        'Tester', 'Engineer', 'Lead', 'Senior', 'SDET', 'Manual',
        // Русские
        'Тестировщик', 'Автоматизатор', 'Инженер', 'Специалист',
        'Тестирование', 'Функциональный'
    ];

    private readonly excludePatterns = [
        'http', 'https://', 'salesforce.com', 'CV -', 'lightning/r/', 'view', 'opportunity'
    ];

    /* ========= PUBLIC static helpers ========= */
    static getStats(): RoleExtractionStats {
        return JSON.parse(JSON.stringify(this.stats));
    }

    static resetStats(): void {
        RoleExtractor.stats = {
            totalAttempts: 0,
            success: 0,
            byMethod: { pattern: 0, keyword: 0, nlp: 0, fallback: 0 },
            topRoles: {}
        };
    }

    static saveStats(fileName = 'role-stats.json'): void {
        const filePath = path.resolve(process.cwd(), fileName);
        fs.writeFileSync(filePath, JSON.stringify(RoleExtractor.getStats(), null, 2), 'utf8');
    }

    /* ========= PUBLIC API ========= */
    extractRole(
        input: string,
        nlpResult?: any,
        config: RoleExtractionConfig = {}
    ): RoleExtractionResult | null {
        RoleExtractor.stats.totalAttempts++;

        const {
            keywords = this.roleKeywords,
            excludePatterns = this.excludePatterns,
            maxLength = 150,
            minLength = 5,
            enableNlpFallback = true
        } = config;

        /* 1. Структурированные поля (НОВОЕ - самый надежный источник) */
        const byStructuredFields = this.extractFromStructuredFields(input);
        if (byStructuredFields) return this.collect(byStructuredFields);

        /* 2. Паттерны роли */
        const byPattern = this.extractByPatterns(input);
        if (byPattern) return this.collect(byPattern);

        /* 3. Первые строки с контекстом */
        const byKeyword = this.extractFromFirstLineEnhanced(input, keywords, excludePatterns, minLength, maxLength);
        if (byKeyword) return this.collect(byKeyword);

        /* 4. Глубокий поиск в описании */
        const deepResult = this.extractFromJobDescription(input);
        if (deepResult) return this.collect(deepResult);

        /* 5. NLP fallback */
        if (enableNlpFallback && nlpResult) {
            const byNlp = this.extractFromNlp(nlpResult);
            if (byNlp) return this.collect(byNlp);
        }

        /* 6. Fallback для особых случаев */
        const specialResult = this.extractSpecialCases(input);
        if (specialResult) return this.collect(specialResult);

        return null;
    }

    /* ========= НОВЫЕ МЕТОДЫ ========= */

    /**
     * НОВЫЙ: Извлечение из структурированных полей (14, 33, заголовки)
     */
    private extractFromStructuredFields(input: string): RoleExtractionResult | null {
        const fieldPatterns = [
            // Поле 14 - детальные требования (самый частый источник ролей)
            /14\.\s*(?:Подробные требования к разработчику|Detailed requirements)\s*([^\n]{10,120})/i,

            // Заголовок CV строки - более точный паттерн
            /CV\s*-\s*QA\s*-[^-]*-\s*([^-\n]{10,80})\s*-/i,

            // Поле 33 - первичный запрос
            /33\.\s*(?:Первичный запрос|Primary request)\s*([^\n]{10,120})/i,

            // "We are looking for" конструкции
            /(?:We are (?:looking for|seeking)|Looking for|Ищем|Нужен)\s+(?:a\s+)?([^\n,.]{10,100})/i,

            // "Job Title/Position" поля
            /(?:Job Title|Position|Role)\s*:?\s*([^\n]{10,80})/i,

            // В начале описания вакансии
            /^([A-Z][^.\n]{10,80}(?:Engineer|Tester|QA|Lead))/im,
        ];

        for (let i = 0; i < fieldPatterns.length; i++) {
            const pattern = fieldPatterns[i];
            const match = input.match(pattern);

            if (match && match[1]) {
                const candidate = match[1].trim();

                // Проверяем что это похоже на роль
                if (this.isValidRoleString(candidate) && !this.isCompany(candidate)) {
                    // Очищаем от лишнего текста
                    const cleanRole = this.cleanStructuredRole(candidate);

                    // Определяем тип тестирования из контекста
                    const testingType = this.detectTestingType(input, candidate);
                    const enhancedRole = this.enhanceRoleWithType(cleanRole, testingType);

                    return {
                        role: this.normalizeRole(enhancedRole),
                        confidence: 0.9 - (i * 0.05), // Убывающая уверенность по приоритету
                        method: 'pattern',
                        source: `field_${i + 1}: ${candidate}`,
                        testingType
                    };
                }
            }
        }

        return null;
    }

    /**
     * НОВЫЙ: Определение типа тестирования (manual/automation/both)
     */
    private detectTestingType(input: string, roleContext?: string): 'manual' | 'automation' | 'both' | 'unknown' {
        const combinedText = `${roleContext || ''} ${input}`.toLowerCase();

        const manualKeywords = ['manual', 'ручное', 'функциональное', 'manual testing', 'manual qa'];
        const automationKeywords = ['automation', 'automated', 'авто', 'автоматизация', 'selenium', 'cypress', 'playwright', 'appium'];

        const hasManual = manualKeywords.some(keyword => combinedText.includes(keyword));
        const hasAutomation = automationKeywords.some(keyword => combinedText.includes(keyword));

        if (hasManual && hasAutomation) return 'both';
        if (hasAutomation) return 'automation';
        if (hasManual) return 'manual';

        // Определяем по упоминанию инструментов
        const automationTools = ['java', 'python', 'javascript', 'rest-assured', 'junit', 'testng', 'postman', 'api'];
        const hasAutomationTools = automationTools.some(tool => combinedText.includes(tool));

        if (hasAutomationTools) return 'automation';

        return 'unknown';
    }

    /**
     * НОВЫЙ: Улучшение роли с типом тестирования
     */
    private enhanceRoleWithType(role: string, testingType: string): string {
        if (testingType === 'unknown') return role;

        const roleLower = role.toLowerCase();

        // Если тип уже указан в роли, не дублируем
        if (roleLower.includes('manual') || roleLower.includes('automation')) {
            return role;
        }

        // Добавляем тип тестирования к роли
        switch (testingType) {
            case 'manual':
                if (roleLower.includes('qa') && !roleLower.includes('manual')) {
                    return role.replace(/QA/i, 'Manual QA');
                }
                break;
            case 'automation':
                if (roleLower.includes('qa') && !roleLower.includes('automation')) {
                    return role.replace(/QA/i, 'QA Automation');
                }
                break;
            case 'both':
                // Для смешанных ролей оставляем как есть
                return role;
        }

        return role;
    }

    /**
     * НОВЫЙ: Улучшенный поиск в первых строках
     */
    private extractFromFirstLineEnhanced(
        input: string,
        keywords: string[],
        exclude: string[],
        minLen: number,
        maxLen: number
    ): RoleExtractionResult | null {
        const lines = input.split('\n').map(l => l.trim()).filter(Boolean);

        for (let i = 0; i < Math.min(10, lines.length); i++) { // Увеличили до 10 строк
            const line = lines[i];

            if (this.isServiceLine(line)) continue;

            const hasKey = keywords.some(k => new RegExp(`\\b${k}\\b`, 'i').test(line));
            const hasExcl = exclude.some(p => line.includes(p));

            if (hasKey && !hasExcl && line.length >= minLen && line.length <= maxLen) {
                if (this.isValidRoleString(line) && !this.isCompany(line)) {
                    const testingType = this.detectTestingType(input, line);
                    const enhancedRole = this.enhanceRoleWithType(line, testingType);

                    return {
                        role: this.normalizeRole(enhancedRole),
                        confidence: 0.7 - (i * 0.05),
                        method: 'keyword',
                        source: line,
                        testingType
                    };
                }
            }
        }

        return null;
    }

    /**
     * НОВЫЙ: Глубокий поиск в описании работы
     */
    private extractFromJobDescription(input: string): RoleExtractionResult | null {
        // Ищем в описаниях обязанностей и требований
        const descriptionPatterns = [
            /(?:Responsibilities|Обязанности|Main Responsibilities)[:\s]+([\s\S]{0,300}?)(?:\n\n|\nRequirements|\nQualifications|$)/i,
            /(?:требования|requirements|qualifications)[:\s]+([\s\S]{0,300}?)(?:\n\n|$)/i,
            /(?:Job Description|Описание)[:\s]+([\s\S]{0,300}?)(?:\n\n|\nRequirements|$)/i,
        ];

        for (const pattern of descriptionPatterns) {
            const match = input.match(pattern);
            if (match && match[1]) {
                const description = match[1];

                // Ищем роли в описании
                const sortedPatterns = [...this.rolePatterns].sort((a, b) => b.priority - a.priority);

                for (const rolePattern of sortedPatterns) {
                    const roleMatch = description.match(rolePattern.pattern);
                    if (roleMatch) {
                        const testingType = this.detectTestingType(description);
                        const enhancedRole = this.enhanceRoleWithType(roleMatch[0], testingType);

                        return {
                            role: this.normalizeRole(enhancedRole),
                            confidence: 0.6,
                            method: 'nlp',
                            source: `job_description: ${roleMatch[0]}`,
                            testingType
                        };
                    }
                }
            }
        }

        return null;
    }

    /* ========= СУЩЕСТВУЮЩИЕ МЕТОДЫ (улучшенные) ========= */

    /** Быстрая проверка: строка похожа на название компании? */
    private isCompany(str: string): boolean {
        if (!str) return true;

        // ✅ Сначала проверяем наличие role keywords - если есть, то это роль
        const hasStrongRoleKeyword = /\b(QA|Engineer|Test|Automation|Tester|Lead|Senior|Junior|Middle|Developer|Specialist|Analyst)\b/i.test(str);
        if (hasStrongRoleKeyword) return false;

        // ✅ Проверяем company noise
        if (this.companyNoise.some(w => new RegExp(`\\b${w}\\b`, 'i').test(str))) {
            return true;
        }

        // ✅ Паттерны компаний (более строгие)
        const companyPatterns = [
            /^[A-Z][a-zA-Z]+\s+(AG|GmbH|Ltd|Inc|LLC|Corp|Group)$/i,
            /^[A-Z][a-zA-Z]+\s+[A-Z][a-zA-Z]+\s+(GmbH|Ltd|Inc)$/i,
        ];

        // ✅ Только блокируем если четко подходит под паттерн компании И длинное
        return companyPatterns.some(p => p.test(str)) && str.length > 15;
    }

    /* ========= INTERNAL: pattern search ========= */
    private extractByPatterns(input: string): RoleExtractionResult | null {
        const sorted = [...this.rolePatterns].sort((a, b) => b.priority - a.priority);

        for (const { pattern, normalize, priority } of sorted) {
            const match = input.match(pattern);
            if (match) {
                const matchedText = match[0];
                const testingType = this.detectTestingType(input, matchedText);
                const role = normalize ? normalize(matchedText) : this.normalizeRole(matchedText);

                return {
                    role,
                    confidence: 0.9 + priority / 100,
                    method: 'pattern',
                    source: matchedText,
                    testingType
                };
            }
        }

        return null;
    }

    /* ========= INTERNAL: NLP entities ========= */
    private extractFromNlp(nlp: any): RoleExtractionResult | null {
        const ent = nlp?.entities?.find((e: any) => e.entity === 'full_role');
        if (ent) {
            const testingType = this.detectTestingType(nlp.utterance || '', ent.sourceText);
            const enhancedRole = this.enhanceRoleWithType(ent.sourceText, testingType);

            return {
                role: this.normalizeRole(enhancedRole),
                confidence: 0.8,
                method: 'nlp',
                source: ent.sourceText,
                testingType
            };
        }

        return null;
    }

    /**
     * Последний fallback для особых случаев
     */
    private extractSpecialCases(input: string): RoleExtractionResult | null {
        // Ищем в заголовках типа "CV - QA - ..."
        const cvMatch = input.match(/CV\s*-\s*QA\s*-[^-]*-\s*([^-\n]{10,60})/i);
        if (cvMatch && !this.isCompany(cvMatch[1])) {
            const role = cvMatch[1].trim();
            if (!role.includes('http') && !role.includes('R-') && this.isValidRoleString(role)) {
                const testingType = this.detectTestingType(input, role);
                const enhancedRole = this.enhanceRoleWithType(role, testingType);

                return {
                    role: this.normalizeRole(enhancedRole),
                    confidence: 0.5,
                    method: 'fallback',
                    source: `cv_header: ${role}`,
                    testingType
                };
            }
        }

        // Ищем "looking for [роль]"
        const lookingMatch = input.match(/(?:looking for|ищем|нужен)\s+(?:a\s+)?([^.,\n]{5,50})/i);
        if (lookingMatch && !this.isCompany(lookingMatch[1])) {
            const role = lookingMatch[1].trim();
            if (/qa|test|engineer|tester|automation/i.test(role)) {
                const testingType = this.detectTestingType(input, role);
                const enhancedRole = this.enhanceRoleWithType(role, testingType);

                return {
                    role: this.normalizeRole(enhancedRole),
                    confidence: 0.4,
                    method: 'fallback',
                    source: `looking_for: ${role}`,
                    testingType
                };
            }
        }

        return null;
    }

    /* ========= INTERNAL: normalize & stat helper ========= */
    private normalizeRole(raw: string): string {
        // Filters
        if (!raw) return 'Unknown Role';
        if (this.isCompany(raw)) return 'Unknown Role';
        if (raw.length > 80) return 'Unknown Role';

        let role = raw.toLowerCase()
            // Специфичные замены для QA ролей
            .replace(/mobile\s+app\s+test\s+automation\s+engineer/gi, 'Mobile App Test Automation Engineer')
            .replace(/qa\s+automation\s+engineer/gi, 'QA Automation Engineer')
            .replace(/manual\s+qa\s+(?:engineer|tester)/gi, 'Manual QA Engineer')
            .replace(/test\s+automation\s+engineer/gi, 'Test Automation Engineer')
            .replace(/quality\s+assurance\s+automation\s+engineer/gi, 'QA Automation Engineer')
            .replace(/hands-on\s+lead\s+qa\s+engineer/gi, 'Lead QA Engineer')
            .replace(/senior\s+qa\s+automation\s+engineer/gi, 'Senior QA Automation Engineer')
            .replace(/lead\s+qa\s+automation\s+engineer/gi, 'Lead QA Automation Engineer')
            .replace(/it\s+test\s+automation\s+engineer/gi, 'Test Automation Engineer')
            .replace(/fullstack\s+qa\s+engineer/gi, 'Fullstack QA Engineer')
            .replace(/qa\s+engineer\s+fullstack/gi, 'Fullstack QA Engineer')

            // Русские замены
            .replace(/инженер\s+(?:по\s+)?автоматизации\s+тестирования/gi, 'QA Automation Engineer')
            .replace(/aqa\s+java\s+инженер/gi, 'QA Automation Engineer')
            .replace(/автоматизатор\s+тестирования/gi, 'Test Automation Engineer')
            .replace(/функциональный\s+тестировщик/gi, 'Manual QA Engineer')
            .replace(/инженер\s+(?:по\s+)?тестированию/gi, 'QA Engineer')
            .replace(/qa\s+инженер/gi, 'QA Engineer')
            .replace(/тестировщик/gi, 'QA Tester')

            // Общие замены
            .replace(/quality\s+assurance/gi, 'qa')
            .replace(/software\s+development\s+engineer\s+in\s+test/gi, 'sdet')
            .replace(/qa\s*\/\s*manual\s+tester/gi, 'manual qa tester')
            .replace(/senior\s+qa\s*\/\s*aqa/gi, 'senior qa automation engineer')
            .replace(/\s+/g, ' ')
            .trim();

        // Капитализация
        role = role.split(' ').map(word => {
            const upper = word.toUpperCase();
            if (['QA', 'API', 'SDET', 'IT', 'UI', 'UX'].includes(upper)) {
                return upper;
            }
            return word.charAt(0).toUpperCase() + word.slice(1);
        }).join(' ');

        // Финальная нормализация
        return role
            .replace(/Engineers?$/i, 'Engineer')
            .replace(/Testers?$/i, 'Tester')
            .replace(/Leads?$/i, 'Lead');
    }

    /** Проверяет служебные строки которые нужно пропустить */
    private isServiceLine(line: string): boolean {
        const servicePatterns = [
            /^CV\s*-/i, // CV - заголовки
            /^https?:\/\//i, // URLs
            /^R-\d+/i, // Request IDs
            /lightning\/r\//i, // Salesforce URLs
            /^[A-Z]{2,}\s*-\s*[A-Z]{2,}/i, // "US - QA" формат
            /^\d{4}-\d{2}-\d{2}/, // Даты
            /^[A-Z]{2,}:\s/i // "US: " формат
        ];

        return servicePatterns.some(pattern => pattern.test(line.trim()));
    }

    /** Проверяет что строка выглядит как валидная роль */
    private isValidRoleString(str: string): boolean {
        if (!str || str.length < 3 || str.length > 120) return false;

        // Должны быть QA-индикаторы
        const qaIndicators = /\b(qa|quality\s+assurance|test|testing|engineer|developer|tester|lead|senior|middle|junior|specialist|architect|analyst|manager|automation|manual|sdet)\b/i;

        // Избегаем строк с большими номерами, email, URLs
        const hasUnwantedContent = /\d{4,}|@|\.com|\.org|http|lightning\/r/i;

        // Избегаем служебные строки
        const isServiceLine = /^(CV\s*-|https?:\/\/|R-\d+|\d{4}-\d{2}-\d{2})/i;

        return qaIndicators.test(str) &&
            !hasUnwantedContent.test(str) &&
            !isServiceLine.test(str);
    }

    private collect(res: RoleExtractionResult): RoleExtractionResult {
        if (res.role === 'Unknown Role') return res;

        RoleExtractor.stats.success++;
        RoleExtractor.stats.byMethod[res.method]++;
        RoleExtractor.stats.topRoles[res.role] = (RoleExtractor.stats.topRoles[res.role] ?? 0) + 1;

        return res;
    }

    /**
     * Очищает роль от лишнего текста в структурированных полях
     */
    private cleanStructuredRole(role: string): string {
        // Убираем частые префиксы
        return role
            .replace(/^(?:highly skilled and experienced|experienced|skilled|talented)\s+/i, '')
            .replace(/^(?:professional|specialist|expert)\s+/i, '')
            .replace(/\s+(?:professional|to join our team|specialist).*$/i, '')
            .replace(/\s*[.,].*$/i, '') // Убираем все после первой точки/запятой
            .trim();
    }
}
