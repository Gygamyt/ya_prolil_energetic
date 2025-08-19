interface RoleExtractionConfig {
    expectedRoleTypes?: RoleType[];
    confidence?: number;
    debug?: boolean;
}

interface RoleExtractionResult {
    role: string;
    roleType: RoleType;
    confidence: number;
    source: string;
    method: string;
}

enum RoleType {
    QA_AUTOMATION = 'qa_automation',
    QA_MANUAL = 'qa_manual',
    QA_GENERAL = 'qa_general',
    QA_LEAD = 'qa_lead',
    QA_SENIOR = 'qa_senior',
    QA_FULLSTACK = 'qa_fullstack',
    QA_MOBILE = 'qa_mobile',
    SDET = 'sdet',
    TEST_ENGINEER = 'test_engineer'
}

export class RoleExtractorV3 {

    /**
     * Дефолтные типы ролей - что мы ищем по умолчанию
     */
    private readonly defaultRoleTypes: RoleType[] = [
        RoleType.QA_AUTOMATION,
        RoleType.QA_MANUAL,
        RoleType.QA_GENERAL,
        RoleType.QA_LEAD,
        RoleType.QA_SENIOR,
        RoleType.QA_FULLSTACK,
        RoleType.QA_MOBILE,
        RoleType.SDET,
        RoleType.TEST_ENGINEER
    ];

    /**
     * Mapping: RoleType → возможные названия ролей
     */
    private readonly roleTypeMapping: Record<RoleType, string[]> = {
        [RoleType.QA_AUTOMATION]: [
            'QA Automation Engineer',
            'QA Automation',
            'Automation QA Engineer',
            'Test Automation Engineer',
            'AQA Engineer'
        ],
        [RoleType.QA_MANUAL]: [
            'Manual QA Engineer',
            'Manual QA Tester',
            'Manual Tester',
            'QA Manual Engineer',
            'Manual QA'
        ],
        [RoleType.QA_GENERAL]: [
            'QA Engineer',
            'Quality Assurance Engineer',
            'QA Tester',
            'Quality Engineer'
        ],
        [RoleType.QA_LEAD]: [
            'Lead QA Engineer',
            'QA Lead',
            'Lead QA Automation Engineer',
            'QA Team Lead'
        ],
        [RoleType.QA_SENIOR]: [
            'Senior QA Engineer',
            'Senior QA Automation Engineer',
            'Senior Manual QA Engineer',
            'Senior QA'
        ],
        [RoleType.QA_FULLSTACK]: [
            'Fullstack QA Engineer',
            'QA Engineer Fullstack',
            'Full Stack QA'
        ],
        [RoleType.QA_MOBILE]: [
            'Mobile QA Tester',
            'Mobile App Test Automation Engineer',
            'Mobile QA Engineer'
        ],
        [RoleType.SDET]: [
            'SDET',
            'Software Development Engineer in Test'
        ],
        [RoleType.TEST_ENGINEER]: [
            'Test Engineer',
            'Testing Engineer',
            'Software Test Engineer'
        ]
    };

    /**
     * Паттерны для поиска каждого типа роли
     */
    private readonly rolePatterns: Record<RoleType, RegExp[]> = {
        [RoleType.QA_AUTOMATION]: [
            /\b(?:QA|Quality\s+Assurance)\s+Automation\s+Engineer\b/i,
            /\bAutomation\s+QA\s+Engineer\b/i,
            /\bTest\s+Automation\s+Engineer\b/i,
            /\bAQA\s+Engineer\b/i
        ],
        [RoleType.QA_MANUAL]: [
            /\bManual\s+QA\s*(?:Engineer|Tester)\b/i,
            /\bQA\s+Manual\s*(?:Engineer|Tester)\b/i,
            /\bManual\s+Tester\b/i
        ],
        [RoleType.QA_GENERAL]: [
            /\bQA\s+Engineer\b/i,
            /\bQuality\s+Assurance\s+Engineer\b/i,
            /\bQA\s+Tester\b/i
        ],
        [RoleType.QA_LEAD]: [
            /\bLead\s+QA\s*(?:Engineer|Automation)?\b/i,
            /\bQA\s+Lead\b/i,
            /\bQA\s+Team\s+Lead\b/i
        ],
        [RoleType.QA_SENIOR]: [
            /\bSenior\s+QA\s*(?:Engineer|Automation|Manual)?\b/i,
            /\bSr\.?\s+QA\s+Engineer\b/i
        ],
        [RoleType.QA_FULLSTACK]: [
            /\bFullstack\s+QA\s+Engineer\b/i,
            /\bQA\s+Engineer\s+Fullstack\b/i,
            /\bFull\s+Stack\s+QA\b/i
        ],
        [RoleType.QA_MOBILE]: [
            /\bMobile\s+(?:App\s+)?(?:Test\s+)?(?:Automation\s+)?(?:QA\s+)?(?:Engineer|Tester)\b/i,
            /\bMobile\s+QA\s*(?:Engineer|Tester)\b/i
        ],
        [RoleType.SDET]: [
            /\bSDET\b/i,
            /\bSoftware\s+Development\s+Engineer\s+in\s+Test\b/i
        ],
        [RoleType.TEST_ENGINEER]: [
            /\bTest\s+Engineer\b/i,
            /\bTesting\s+Engineer\b/i,
            /\bSoftware\s+Test\s+Engineer\b/i
        ]
    };

    /**
     * Главный метод извлечения роли
     */
    extractRole(
        input: string,
        config: RoleExtractionConfig = {}
    ): RoleExtractionResult | null {

        const targetRoleTypes = config.expectedRoleTypes || this.defaultRoleTypes;
        const debug = config.debug || false;

        if (debug) console.log(`🎯 Looking for role types: ${targetRoleTypes.join(', ')}`);

        // Ищем все возможные совпадения для целевых типов ролей
        const candidates = this.findCandidates(input, targetRoleTypes, debug);

        if (candidates.length === 0) {
            if (debug) console.log('❌ No candidates found');
            return null;
        }

        // Выбираем лучшего кандидата
        const best = this.selectBestCandidate(candidates, debug);

        if (debug) console.log(`✅ Selected: ${best.role} (${best.roleType})`);

        return best;
    }

    /**
     * Ищем всех кандидатов для целевых типов ролей
     */
    private findCandidates(
        input: string,
        targetRoleTypes: RoleType[],
        debug: boolean
    ): RoleExtractionResult[] {
        const candidates: RoleExtractionResult[] = [];

        // Для каждого целевого типа роли
        for (const roleType of targetRoleTypes) {
            const patterns = this.rolePatterns[roleType];
            const possibleNames = this.roleTypeMapping[roleType];

            // 1. Ищем по точным паттернам
            for (const pattern of patterns) {
                const matches = this.findByPattern(input, pattern, roleType, debug);
                candidates.push(...matches);
            }

            // 2. Ищем по точным названиям
            for (const name of possibleNames) {
                const matches = this.findByExactName(input, name, roleType, debug);
                candidates.push(...matches);
            }
        }

        return candidates;
    }

    /**
     * Поиск по паттерну
     */
    private findByPattern(
        input: string,
        pattern: RegExp,
        roleType: RoleType,
        debug: boolean
    ): RoleExtractionResult[] {
        const matches = input.match(new RegExp(pattern.source, 'gi'));
        if (!matches) return [];

        return matches.map(match => {
            const normalized = this.normalizeRoleName(match, roleType);

            if (debug) console.log(`🔍 Pattern match: "${match}" → "${normalized}"`);

            return {
                role: normalized,
                roleType,
                confidence: 0.9,
                source: `pattern: ${match}`,
                method: 'pattern'
            };
        });
    }

    /**
     * Поиск по точному названию
     */
    private findByExactName(
        input: string,
        name: string,
        roleType: RoleType,
        debug: boolean
    ): RoleExtractionResult[] {
        const regex = new RegExp(`\\b${name.replace(/\s+/g, '\\s+')}\\b`, 'gi');
        const matches = input.match(regex);
        if (!matches) return [];

        return matches.map(match => {
            if (debug) console.log(`🎯 Exact match: "${match}" → "${name}"`);

            return {
                role: name,
                roleType,
                confidence: 0.95,
                source: `exact: ${match}`,
                method: 'exact'
            };
        });
    }

    /**
     * Выбираем лучшего кандидата
     */
    private selectBestCandidate(
        candidates: RoleExtractionResult[],
        debug: boolean
    ): RoleExtractionResult {
        // Сортируем по confidence, затем по специфичности (длине роли)
        const sorted = candidates.sort((a, b) => {
            if (b.confidence !== a.confidence) return b.confidence - a.confidence;
            return b.role.length - a.role.length;
        });

        if (debug) {
            console.log('📊 All candidates:');
            sorted.forEach((c, i) =>
                console.log(`  ${i+1}. ${c.role} (${c.confidence}, ${c.roleType})`)
            );
        }

        return sorted[0];
    }

    /**
     * Нормализация названия роли
     */
    private normalizeRoleName(rawRole: string, roleType: RoleType): string {
        // Получаем основное название для этого типа
        const mainName = this.roleTypeMapping[roleType][0];

        // Пытаемся определить модификаторы (Senior, Lead, etc.)
        const modifiers = this.extractModifiers(rawRole);

        if (modifiers.length > 0) {
            return `${modifiers.join(' ')} ${mainName}`;
        }

        return mainName;
    }

    /**
     * Извлекаем модификаторы уровня (Senior, Lead, etc.)
     */
    private extractModifiers(role: string): string[] {
        const modifiers = [];

        if (/\bSenior\b/i.test(role)) modifiers.push('Senior');
        if (/\bLead\b/i.test(role)) modifiers.push('Lead');
        if (/\bJunior\b/i.test(role)) modifiers.push('Junior');
        if (/\bMiddle\b/i.test(role)) modifiers.push('Middle');

        return modifiers;
    }

    /**
     * Утилита: получить все возможные роли для типа
     */
    getPossibleRolesForType(roleType: RoleType): string[] {
        return this.roleTypeMapping[roleType];
    }

    /**
     * Утилита: получить тип роли по названию
     */
    getRoleTypeByName(roleName: string): RoleType | null {
        for (const [type, names] of Object.entries(this.roleTypeMapping)) {
            if (names.some(name =>
                name.toLowerCase() === roleName.toLowerCase()
            )) {
                return type as RoleType;
            }
        }
        return null;
    }
}

// Экспортируем типы и энумы
export { RoleType, RoleExtractionConfig, RoleExtractionResult };
