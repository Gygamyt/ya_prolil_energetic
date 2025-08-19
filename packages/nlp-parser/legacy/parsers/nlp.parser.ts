// @ts-ignore
import { NlpManager } from 'node-nlp';
import { BaseParser } from './base.parser';
import { ClientRequest, ExtractionRoleConfig, LanguageRequirement, ParseResult } from '../types';
import { RoleExtractor, TechnologyExtractor } from "../extractors";


/**
 * NLP-based parser for extracting client request data from unstructured text.
 * Uses node-nlp library for Named Entity Recognition and natural language processing.
 */
export class NLPParser extends BaseParser {
    private nlpManager: NlpManager;
    private technologyExtractor: TechnologyExtractor;
    private roleExtractor: RoleExtractor;

    private trained: boolean = false;
    private readonly isProduction: boolean;

    // ═══════════════════════════════════════════════════════════════════════════════════
    // INITIALIZATION & CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════════════

    /**
     * Creates a new NLP Parser instance.
     * Initializes the NLP manager with English and Russian language support.
     */
    constructor() {
        super();
        this.technologyExtractor = new TechnologyExtractor();
        this.roleExtractor = new RoleExtractor();
        this.isProduction = process.env.NODE_ENV === 'production';
        this.log('🤖 NLP Parser initialized');
        this.nlpManager = new NlpManager({
            languages: ['en', 'ru'],
            forceNER: true,
            nlu: { useNoneFeature: false }
        });
    }

    /**
     * Parses input text and extracts client request data using NLP and regex fallbacks.
     * @param input - Raw text to parse (typically Salesforce request content)
     * @param options - Parsing options
     * @returns Promise resolving to ParseResult with extracted data
     */
    async parse(input: string, options: { normalize?: boolean } = {}): Promise<ParseResult> {
        const startTime = Date.now();
        this.log(`🚀 Starting NLP parse for input length: ${input.length}`);

        if (options.normalize) {
            input = this.normalizeInput(input);
            this.log(`📝 Normalized input length: ${input.length}`);
        }

        try {
            await this.trainIfNeeded();
            const data = this.createBaseClientRequest(input);
            this.log('📝 Created base client request structure');

            this.log('🧠 Running NLP analysis...');
            const nlpResult = await this.nlpManager.process(input);
            this.log(`🎯 NLP entities found: ${nlpResult.entities?.length || 0}`);
            this.log(`📊 NLP confidence: ${nlpResult.score}`);

            if (nlpResult.entities && nlpResult.entities.length > 0) {
                const entities = nlpResult.entities.map((e: { entity: any; sourceText: any; }) => `${e.entity}: "${e.sourceText}"`).join(', ');
                this.log(`🔍 Found entities: ${entities}`);
            }

            this.log('⚙️ Extracting fields...');
            this.extractRoleWithExtractor(input, nlpResult, data);
            this.extractResponsibilities(input, data); // Keep as is for now
            this.extractLevelsSemantic(input, nlpResult, data);
            this.extractTeamSizeSemantic(input, data);
            this.extractSalesManager(input, nlpResult, data); // Keep NLP-based
            this.extractCoordinator(input, nlpResult, data); // Keep NLP-based
            this.extractIndustrySemantic(input, data);
            this.extractLanguagesSemantic(input, data);
            this.extractLocation(input, data); // Keep as is for now
            this.extractTechnologies(input, data);

            data.parseConfidence = this.calculateConfidence(data);
            data.processedAt = new Date();

            const extractedFields = this.getExtractedFields(data);
            this.log(`✅ Extraction completed. Fields found: [${extractedFields.join(', ')}]`);
            this.log(`📈 Final confidence: ${data.parseConfidence}`);

            if (this.validateParsedData(data)) {
                data.status = 'completed';
                this.log('✅ Data validation passed');
            } else {
                this.warn('⚠️ Data validation failed');
            }

            const endTime = Date.now();
            const parseTime = endTime - startTime;
            this.log(`⏱️ Total parse time: ${parseTime}ms`);

            return {
                success: true,
                confidence: data.parseConfidence || 0,
                strategy: 'nlp',
                extractedFields,
                data: data as ClientRequest
            };

        } catch (error) {
            this.error('❌ NLP parsing failed:', error);
            return this.handleError(error);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════════════
    // TEXT PREPROCESSING
    // ═══════════════════════════════════════════════════════════════════════════════════

    /**
     * Returns the parsing strategy identifier.
     * @returns Currently the strategy name only 'nlp'
     */
    protected getStrategy() {
        return 'nlp' as const;
    }

    // ═══════════════════════════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════════════════════════

    /**
     * Normalizes raw Word text by inserting proper line breaks.
     * Fixes issues where numbered fields get merged into single lines.
     * @param input - Raw text input
     * @returns Normalized text with proper line breaks
     */
    private normalizeInput(input: string): string {
        return input
            .replace(/(\d{1,2}\.)/g, '\n$1')
            .replace(/\s*(Responsibilities:|Requirements:|Tech Stack:|Project Context|Qualifications:)/gi, '\n$1')
            .replace(/\u00A0/g, ' ')
            .replace(/\n+/g, '\n')
            .trim();
    }

    // ═══════════════════════════════════════════════════════════════════════════════════
    // LOGGING UTILITIES
    // ═══════════════════════════════════════════════════════════════════════════════════

    /**
     * Logs debug messages in non-production environments.
     * @param message - Message to log
     * @param args - Additional arguments to log
     */
    private log(message: string, ...args: any[]) {
        if (!this.isProduction) {
            console.log(message, ...args);
        }
    }

    /**
     * Logs warning messages in non-production environments.
     * @param message - Warning message to log
     * @param args - Additional arguments to log
     */
    private warn(message: string, ...args: any[]) {
        if (!this.isProduction) {
            console.warn(message, ...args);
        }
    }

    /**
     * Logs error messages in non-production environments.
     * @param message - Error message to log
     * @param args - Additional arguments to log
     */
    private error(message: string, ...args: any[]) {
        if (!this.isProduction) {
            console.error(message, ...args);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════════════
    // NLP TRAINING & SETUP
    // ═══════════════════════════════════════════════════════════════════════════════════

    /**
     * Trains the NLP model with predefined entities if not already trained.
     * Includes person names, technical roles, full roles, and experience levels.
     */
    private async trainIfNeeded() {
        if (this.trained) {
            this.log('📚 NLP already trained, skipping...');
            return;
        }

        this.log('🎓 Training NLP model...');
        const startTime = Date.now();

        // ─────────────────────────────────────────────────────────────────────────────
        // Person entities training
        // ─────────────────────────────────────────────────────────────────────────────
        this.log('👥 Training person entities...');
        this.nlpManager.addNamedEntityText('person', 'Andrei Robilka', ['en', 'ru']);
        this.nlpManager.addNamedEntityText('person', 'Alesia Lahoika', ['en', 'ru']);
        this.nlpManager.addNamedEntityText('person', 'John Smith', ['en']);
        this.nlpManager.addNamedEntityText('person', 'Maria Garcia', ['en']);

        // ─────────────────────────────────────────────────────────────────────────────
        // Technical role entities training
        // ─────────────────────────────────────────────────────────────────────────────
        this.log('🔧 Training tech role entities...');
        this.nlpManager.addNamedEntityText('tech_role', 'QA Engineer', ['en']);
        this.nlpManager.addNamedEntityText('tech_role', 'Test Automation Engineer', ['en']);
        this.nlpManager.addNamedEntityText('tech_role', 'Full Stack Developer', ['en']);
        this.nlpManager.addNamedEntityText('tech_role', 'Frontend Developer', ['en']);
        this.nlpManager.addNamedEntityText('tech_role', 'Backend Developer', ['en']);
        this.nlpManager.addNamedEntityText('tech_role', 'React Developer', ['en']);
        this.nlpManager.addNamedEntityText('tech_role', 'Mobile Developer', ['en']);
        this.nlpManager.addNamedEntityText('tech_role', 'DevOps Engineer', ['en']);

        // ─────────────────────────────────────────────────────────────────────────────
        // Full role entities training
        // ─────────────────────────────────────────────────────────────────────────────
        this.log('💼 Training full role entities...');
        const roles = [
            'Mobile App Test Automation Engineer', 'QA Engineer', 'Senior QA Engineer',
            'Manual QA Engineer', 'Lead QA Automation Engineer', 'Quality Assurance Automation Engineer',
            'Test Automation Engineer', 'QA Lead', 'Senior QA Automation Engineer',
            'Test Engineer', 'SDET', 'QA Automation Engineer', 'Mobile QA Tester',
            'IT Test Automation Engineer', 'AQA Java Engineer', 'Functional Tester'
        ];

        roles.forEach(role => {
            this.nlpManager.addNamedEntityText('full_role', role, ['en', 'ru']);
        });

        // ─────────────────────────────────────────────────────────────────────────────
        // Experience level entities training
        // ─────────────────────────────────────────────────────────────────────────────
        this.log('📊 Training level entities...');
        this.nlpManager.addNamedEntityText('level', 'Senior', ['en', 'ru']);
        this.nlpManager.addNamedEntityText('level', 'Senior+', ['en', 'ru']);
        this.nlpManager.addNamedEntityText('level', 'Middle', ['en', 'ru']);
        this.nlpManager.addNamedEntityText('level', 'Middle+', ['en', 'ru']);
        this.nlpManager.addNamedEntityText('level', 'Middle-', ['en', 'ru']);
        this.nlpManager.addNamedEntityText('level', 'Junior', ['en', 'ru']);
        this.nlpManager.addNamedEntityText('level', 'Junior+', ['en', 'ru']);
        this.nlpManager.addNamedEntityText('level', 'Lead', ['en', 'ru']);

        await this.nlpManager.train();

        const endTime = Date.now();
        const trainTime = endTime - startTime;
        this.log(`🎓 NLP training completed in ${trainTime}ms`);
        this.trained = true;
    }

    // ═══════════════════════════════════════════════════════════════════════════════════
    // SEMANTIC FIELD EXTRACTION
    // ═══════════════════════════════════════════════════════════════════════════════════

    /**
     * Extracts role using the dedicated RoleExtractor
     * @param input - Input text to analyze
     * @param nlpResult - NLP processing result
     * @param data - Client request data object to populate
     */
    private extractRoleWithExtractor(
        input: string,
        nlpResult: any,
        data: Partial<ClientRequest>
    ) {
        this.log('💼 Extracting role with RoleExtractor...');

        const result = this.roleExtractor.extractRole(input, nlpResult);

        if (result) {
            data.role = result.role;
            this.log(`💼 Found role: "${result.role}" (method: ${result.method}, confidence: ${result.confidence.toFixed(2)})`);
            if (result.source) {
                this.log(`💼 Source: ${result.source}`);
            }
        } else {
            this.warn('⚠️ No role found with RoleExtractor');
        }
    }

    private extractTechnologies(input: string, data: Partial<ClientRequest>) {
        this.log('🔧 Extracting technologies...');

        const technologies = this.technologyExtractor.extractTechnologies(input);
        data.skills = technologies;

        this.log(`🔧 Found technologies: ${technologies.required.length} required, ${technologies.preferred.length} preferred`);
    }

    /**
     * Extracts role using semantic patterns instead of field numbers.
     * Looks for role-related keywords and contexts.
     * @param input - Input text to analyze
     * @param nlpResult - NLP processing result
     * @param data - Client request data object to populate
     * @param config
     */
    private extractRoleSemantic(
        input: string,
        nlpResult: any,
        data: Partial<ClientRequest>,
        config: ExtractionRoleConfig = {}
    ) {
        const {
            keywords = ['QA', 'Quality Assurance', 'Test', 'Automation', 'Tester', 'Engineer', 'Developer'],
            excludePatterns = ['http', 'CV -', 'salesforce.com'],
            maxLength = 150,
            minLength = 5
        } = config;

        this.log('💼 Extracting role (semantic)...');

        const lines = input.split('\n').map(line => line.trim()).filter(Boolean);
        const firstLine = lines[0];

        if (firstLine) {
            const hasRoleKeyword = keywords.some(keyword =>
                new RegExp(`\\b${keyword}\\b`, 'i').test(firstLine)
            );

            const hasExcludedPattern = excludePatterns.some(pattern =>
                firstLine.includes(pattern)
            );

            if (hasRoleKeyword && !hasExcludedPattern &&
                firstLine.length >= minLength && firstLine.length <= maxLength) {
                this.log(`💼 Found role from first line: "${firstLine}"`);
                data.role = firstLine;
                return;
            }
        }

        // ✅ 3. NLP fallback
        const fullRoleEntities = nlpResult.entities?.filter((e: any) => e.entity === 'full_role');
        if (fullRoleEntities && fullRoleEntities.length > 0) {
            const role = fullRoleEntities[0].sourceText;
            this.log(`💼 NLP found full role: "${role}"`);
            data.role = role;
            return;
        }

        this.warn('⚠️ No role found using semantic extraction');
    }

    /**
     * Extracts experience levels using semantic patterns.
     * @param input - Input text to analyze
     * @param nlpResult - NLP processing result
     * @param data - Client request data object to populate
     */
    private extractLevelsSemantic(input: string, nlpResult: any, data: Partial<ClientRequest>) {
        this.log('🎯 Extracting levels (semantic)...');

        // 1. Look for level keywords with context
        const levelPatterns = [
            /(?:уровень|level|seniority|experience)\s*[:\-]?\s*(senior\+?|middle[\+\-]?|junior\+?|lead)/i,
            /(?:senior|middle|junior|lead)[\+\-]?\s+(?:level|developer|engineer)/i,
            /(?:ищем|нужен|требуется)\s+(senior\+?|middle[\+\-]?|junior\+?|lead)/i
        ];

        for (const pattern of levelPatterns) {
            const match = input.match(pattern);
            if (match) {
                // ✅ Правильно извлекаем строку
                let level = match[1];
                if (!level || typeof level !== 'string') {
                    // @ts-ignore
                    level = match;
                }

                if (typeof level !== 'string') {
                    continue;
                }

                const normalizedLevel = level.replace(/\s+(?:level|developer|engineer).*/i, '').trim();
                const capitalizedLevel = normalizedLevel.charAt(0).toUpperCase() + normalizedLevel.slice(1).toLowerCase();

                this.log(`🎯 Found level by pattern: "${capitalizedLevel}"`);
                data.levels = [capitalizedLevel];
                return;
            }
        }

        // 2. NLP entities as fallback
        const levelEntities = nlpResult.entities?.filter((e: any) => e.entity === 'level');
        if (levelEntities && levelEntities.length > 0) {
            const levels = levelEntities.map((e: any) => e.sourceText);
            this.log(`🎯 NLP found levels: [${levels.join(', ')}]`);
            data.levels = levels;
            return;
        }

        // 3. Experience years pattern
        const yearsPattern = /(\d+)[\+\-]?\s*(?:years?|лет|года)\s*(?:of\s+)?(?:experience|опыта)/i;
        const yearsMatch = input.match(yearsPattern);
        if (yearsMatch && yearsMatch[1]) {
            const years = parseInt(yearsMatch[1]);
            let level = 'Middle';
            if (years >= 5) level = 'Senior';
            else if (years <= 2) level = 'Junior';

            this.log(`🎯 Inferred level from years: "${level}" (${years} years)`);
            data.levels = [level];
            return;
        }

        this.warn('⚠️ No levels found using semantic extraction');
    }


    /**
     * Extracts industry using semantic patterns.
     * @param input - Input text to analyze
     * @param data - Client request data object to populate
     */
    private extractIndustrySemantic(input: string, data: Partial<ClientRequest>) {
        this.log('🏭 Extracting industry (semantic)...');

        const industryPatterns = [
            /(?:индустрия|industry|sector|domain)\s*[:\-]?\s*([^.\n]{5,50})/i,
            /(?:работа в|work in|компания в)\s*(?:сфере\s+)?([^.\n]{5,50})/i,
            /(?:финтех|fintech|банк|bank|страхование|insurance)/i,
            /(?:IT|информационные технологии|information technologies)/i,
            /(?:healthcare|медицина|здравоохранение)/i,
            /(?:e-commerce|электронная коммерция|онлайн торговля)/i
        ];

        for (const pattern of industryPatterns) {
            const match = input.match(pattern);
            if (match) {
                // ✅ Правильно извлекаем строку из match
                let industry = match[1] || match;

                // ✅ Проверяем что industry это строка
                if (typeof industry !== 'string') {
                    continue;
                }

                // Normalize common industries
                industry = industry
                    .replace(/IT|информационные технологии/i, 'Information Technologies')
                    .replace(/финтех|fintech/i, 'FinTech')
                    .replace(/банк|banking/i, 'Banking')
                    .replace(/healthcare|медицина/i, 'Healthcare')
                    .trim();

                this.log(`🏭 Found industry: "${industry}"`);
                data.industry = industry;
                return;
            }
        }

        this.warn('⚠️ No industry found using semantic extraction');
    }


    /**
     * Extracts team size using semantic patterns.
     * @param input - Input text to analyze
     * @param data - Client request data object to populate
     */
    private extractTeamSizeSemantic(input: string, data: Partial<ClientRequest>) {
        this.log('👥 Extracting team size (semantic)...');

        const teamSizePatterns = [
            /(?:количество|number|team size|нужно|need|требуется)\s*[:\-]?\s*(\d+)/i,
            /(\d+)\s*(?:специалист|developer|engineer|person|people)/i,
            /(?:команда|team)\s*(?:из\s*)?(\d+)/i,
            /(?:загрузка|capacity|load)\s*[:\-]?\s*(\d+)/i
        ];

        for (const pattern of teamSizePatterns) {
            const match = input.match(pattern);
            if (match) {
                const size = parseInt(match[1]);
                if (size > 0 && size <= 50) { // Reasonable range
                    this.log(`👥 Found team size: ${size}`);
                    data.teamSize = size;
                    return;
                }
            }
        }

        this.warn('⚠️ No team size found using semantic extraction');
    }

    /**
     * Extracts language requirements using semantic patterns.
     * @param input - Input text to analyze
     * @param data - Client request data object to populate
     */
    private extractLanguagesSemantic(input: string, data: Partial<ClientRequest>) {
        this.log('🌐 Extracting languages (semantic)...');

        const langPatterns = [
            /(?:Min уровень английского языка|английского языка|english level)\s*[:\-]?\s*(A[0-2]|B[1-2]\+?|C[1-2]|beginner|intermediate|advanced|fluent|native)/i,
            /(?:english|английский)\s*[:\-]?\s*(A[0-2]|B[1-2]\+?|C[1-2]|beginner|intermediate|advanced|fluent|native)/i,
            /(A[0-2]|B[1-2]\+?|C[1-2])\s*(?:english|английский)/i
        ];

        for (const pattern of langPatterns) {
            const match = input.match(pattern);
            if (match && match[1]) {
                let level = match[1].trim().toUpperCase();

                // Normalize textual levels to CEFR
                if (/beginner/i.test(level)) level = 'A2';
                else if (/intermediate/i.test(level)) level = 'B1';
                else if (/advanced/i.test(level)) level = 'B2';
                else if (/fluent|native/i.test(level)) level = 'C1';

                const langReq: LanguageRequirement = {
                    language: 'English',
                    level: level as any,
                    priority: 'required'
                };

                this.log(`🌐 Found language requirement: English ${level}`);
                data.languageRequirements = [langReq];
                return;
            }
        }

        this.warn('⚠️ No language requirements found using semantic extraction');
    }

    // ═══════════════════════════════════════════════════════════════════════════════════
    // CORE DATA EXTRACTION METHODS
    // ═══════════════════════════════════════════════════════════════════════════════════

    /**
     * Extracts role information using NLP entities with regex fallback.
     * Prioritizes full role entities, then combines level + tech_role, then uses regex.
     * @param input - Input text to analyze
     * @param nlpResult - NLP processing result containing entities
     * @param data - Client request data object to populate
     */
    private extractRole(input: string, nlpResult: any, data: Partial<ClientRequest>) {
        this.log('💼 Extracting role...');

        const fullRoleEntities = nlpResult.entities?.filter((e: any) => e.entity === 'full_role');
        if (fullRoleEntities && fullRoleEntities.length > 0) {
            const role = fullRoleEntities[0].sourceText;
            this.log(`💼 NLP found full role: "${role}"`);
            data.role = role;
            return;
        }

        const levelEntities = nlpResult.entities?.filter((e: any) => e.entity === 'level');
        const techRoleEntities = nlpResult.entities?.filter((e: any) => e.entity === 'tech_role');

        if (levelEntities && levelEntities.length > 0 && techRoleEntities && techRoleEntities.length > 0) {
            const level = levelEntities[0].sourceText;
            const techRole = techRoleEntities[0].sourceText;
            const combinedRole = `${level} ${techRole}`;
            this.log(`💼 NLP combined role: "${combinedRole}" (${level} + ${techRole})`);
            data.role = combinedRole;
            return;
        }

        if (techRoleEntities && techRoleEntities.length > 0) {
            const role = techRoleEntities[0].sourceText;
            this.log(`💼 NLP found tech role: "${role}"`);
            data.role = role;
            return;
        }

        this.log('🔄 NLP failed, trying regex fallback...');
        const field14Match = input.match(/14\.\s*Подробные требования к разработчику\s*([^.,\n]+)/i);
        if (field14Match) {
            const role = field14Match[1].trim().split(/[.,]/)[0].trim();
            this.log(`🔍 Regex fallback extracted role from field 14: "${role}"`);
            data.role = role;
            return;
        }

        const field33Match = input.match(/33\.\s*Первичный запрос\s*([^.,\n]+)/i);
        if (field33Match) {
            const role = field33Match[1].trim().split(/[.,]/)[0].trim();
            this.log(`🔍 Regex fallback extracted role from field 33: "${role}"`);
            data.role = role;
            return;
        }

        this.warn('⚠️ No role found in input');
    }

    /**
     * Extracts job responsibilities from structured field 14.
     * Removes duplicate role name from responsibilities if present.
     * @param input - Input text to analyze
     * @param data - Client request data object to populate
     */
    private extractResponsibilities(input: string, data: Partial<ClientRequest>) {
        this.log('📋 Extracting responsibilities...');

        const fullMatch = input.match(/14\.\s*Подробные требования к разработчику\s*([\s\S]*?)(?=Qualifications:|17\.\s*Продолжительность|$)/i);
        if (fullMatch) {
            let respText = fullMatch[1].trim();

            if (data.role && respText.startsWith(data.role)) {
                respText = respText.substring(data.role.length).replace(/^[.,\s]+/, '');
            }

            this.log(`📋 Extracted responsibilities (${respText.length} chars)`);
            data.responsibilities = respText || '';
        } else {
            this.warn('⚠️ No responsibilities found in input');
        }
    }

    /**
     * Extracts experience levels using regex (for modifiers) with NLP fallback.
     * Regex is prioritized to preserve level modifiers like + and -.
     * @param input - Input text to analyze
     * @param nlpResult - NLP processing result containing entities
     * @param data - Client request data object to populate
     */
    private extractLevels(input: string, nlpResult: any, data: Partial<ClientRequest>) {
        this.log('🎯 Extracting levels...');

        const levelMatch = input.match(/6\.\s*Уровень разработчиков\s*([^\n\r]+)/i);
        if (levelMatch) {
            const levelText = levelMatch[1].trim();
            const normalizedLevel = levelText.charAt(0).toUpperCase() + levelText.slice(1);
            this.log(`🔍 Regex extracted level: "${normalizedLevel}" from "${levelText}"`);
            data.levels = [normalizedLevel];
            return;
        }

        const levelEntities = nlpResult.entities?.filter((e: any) => e.entity === 'level');
        if (levelEntities && levelEntities.length > 0) {
            const levels = levelEntities.map((e: any) => e.sourceText);
            this.log(`📊 NLP found levels (fallback): [${levels.join(', ')}]`);
            data.levels = levels;
            return;
        }

        this.warn('⚠️ No levels found in input');
    }

    /**
     * Extracts team size from structured fields 12 or 4.
     * @param input - Input text to analyze
     * @param data - Client request data object to populate
     */
    private extractTeamSize(input: string, data: Partial<ClientRequest>) {
        this.log('👥 Extracting team size...');

        const teamMatch = input.match(/12\.\s*Запрошенное количество сотрудников\s*(\d+)/i);
        if (teamMatch) {
            const teamSize = parseInt(teamMatch[1]);
            this.log(`👥 Extracted team size from field 12: ${teamSize}`);
            data.teamSize = teamSize;
            return;
        }

        const loadMatch = input.match(/4\.\s*Ожидаемая загрузка\s*(\d+)/i);
        if (loadMatch) {
            const teamSize = parseInt(loadMatch[1]);
            this.log(`👥 Extracted team size from field 4: ${teamSize}`);
            data.teamSize = teamSize;
        } else {
            this.warn('⚠️ No team size found in input');
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════════════
    // PERSONAL DATA EXTRACTION
    // ═══════════════════════════════════════════════════════════════════════════════════

    /**
     * Extracts sales manager name using NLP person recognition with regex fallback.
     * @param input - Input text to analyze
     * @param nlpResult - NLP processing result containing entities
     * @param data - Client request data object to populate
     */
    private extractSalesManager(input: string, nlpResult: any, data: Partial<ClientRequest>) {
        this.log('👤 Extracting sales manager...');

        const personEntities = nlpResult.entities?.filter((e: any) => e.entity === 'person');

        for (const person of personEntities || []) {
            const context = input.substring(Math.max(0, person.start - 50), person.end + 50);
            if (/сейлс.*менеджер|sales.*manager/i.test(context)) {
                this.log(`👤 NLP found sales manager: "${person.sourceText}"`);
                data.salesManager = person.sourceText;
                return;
            }
        }

        const salesMatch = input.match(/22\.\s*Сейлс менеджер\s*([^\n\r]+)/i);
        if (salesMatch) {
            const salesManager = salesMatch[1].trim();
            this.log(`🔍 Regex extracted sales manager: "${salesManager}"`);
            data.salesManager = salesManager;
        } else {
            this.warn('⚠️ No sales manager found in input');
        }
    }

    /**
     * Extracts project coordinator name using NLP person recognition with regex fallback.
     * @param input - Input text to analyze
     * @param nlpResult - NLP processing result containing entities
     * @param data - Client request data object to populate
     */
    private extractCoordinator(input: string, nlpResult: any, data: Partial<ClientRequest>) {
        this.log('👥 Extracting coordinator...');

        const personEntities = nlpResult.entities?.filter((e: any) => e.entity === 'person');

        for (const person of personEntities || []) {
            const context = input.substring(Math.max(0, person.start - 50), person.end + 50);
            if (/координатор|coordinator/i.test(context)) {
                this.log(`👥 NLP found coordinator: "${person.sourceText}"`);
                data.coordinator = person.sourceText;
                return;
            }
        }

        const coordMatch = input.match(/31\.\s*Проектный координатор\s*([^\n\r]+)/i);
        if (coordMatch) {
            const coordinator = coordMatch[1].trim();
            this.log(`🔍 Regex extracted coordinator: "${coordinator}"`);
            data.coordinator = coordinator;
        } else {
            this.warn('⚠️ No coordinator found in input');
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════════════
    // PROJECT & REQUIREMENT EXTRACTION
    // ═══════════════════════════════════════════════════════════════════════════════════

    /**
     * Extracts project industry from structured field 1.
     * @param input - Input text to analyze
     * @param data - Client request data object to populate
     */
    private extractIndustry(input: string, data: Partial<ClientRequest>) {
        this.log('🏭 Extracting industry...');

        const industryMatch = input.match(/1\.\s*Индустрия проекта\s*([^\n\r]+)/i);
        if (industryMatch) {
            const industry = industryMatch[1].trim();
            this.log(`🏭 Extracted industry: "${industry}"`);
            data.industry = industry;
        } else {
            this.warn('⚠️ No industry found in input');
        }
    }

    /**
     * Extracts language requirements from structured field 8.
     * Currently focuses on English language requirements.
     * @param input - Input text to analyze
     * @param data - Client request data object to populate
     */
    private extractLanguageRequirements(input: string, data: Partial<ClientRequest>) {
        this.log('🌐 Extracting language requirements...');

        const langMatch = input.match(/8\.\s*Min уровень английского языка\s*([^\n\r]+)/i);
        if (langMatch) {
            const levelText = langMatch[1].trim();
            const langReq: LanguageRequirement = {
                language: 'English',
                level: levelText.toUpperCase() as any,
                priority: 'required'
            };
            this.log(`🌐 Extracted language requirement: English ${levelText}`);
            data.languageRequirements = [langReq];
        } else {
            this.warn('⚠️ No language requirements found in input');
        }
    }

    /**
     * Extracts location requirements from structured field 24.
     * Detects work type (Remote/Office/Hybrid) and geographic regions.
     * @param input - Input text to analyze
     * @param data - Client request data object to populate
     */
    private extractLocation(input: string, data: Partial<ClientRequest>) {
        this.log('📍 Extracting location...');

        const locationMatch = input.match(/24\.\s*Требуемая локация специалиста.*?\s*([^\n\r]+)/i);
        if (!locationMatch) {
            this.warn('⚠️ No location found in input');
            return;
        }

        const locationText = locationMatch[1].trim();
        this.log(`📍 Found location text: "${locationText}"`);

        let workType: "Remote" | "Office" | "Hybrid" | undefined;
        if (/remote/i.test(locationText)) {
            workType = 'Remote';
            this.log('📍 Detected work type: Remote');
        } else if (/office/i.test(locationText)) {
            workType = 'Office';
            this.log('📍 Detected work type: Office');
        } else if (/hybrid/i.test(locationText)) {
            workType = 'Hybrid';
            this.log('📍 Detected work type: Hybrid');
        }

        const regionMatches = locationText.match(/\b(EU|US|BY|PL|UA|CZ|EMEA|APAC|Georgia|Europe|European)\b/gi);
        let regions: string[] = [];
        if (regionMatches) {
            const normalizedRegions = regionMatches.map(r => {
                const upper = r.toUpperCase();
                if (upper === 'EUROPE' || upper === 'EUROPEAN') return 'EU';
                return upper;
            });
            regions = [...new Set(normalizedRegions)];
            this.log(`📍 Detected regions: [${regions.join(', ')}]`);
        }

        data.location = {
            regions: regions.length > 0 ? regions : undefined,
            workType: workType || 'Remote',
            timezone: undefined,
            additionalRequirements: locationText
        };

        this.log('📍 Location extraction completed');
    }
}
