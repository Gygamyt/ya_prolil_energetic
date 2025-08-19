// @ts-ignore
import { NlpManager } from 'node-nlp';

export interface NlpProcessResult {
    utterance: string;
    locale: string;
    languageGuessed: boolean;
    localeIso2: string;
    language: string;
    domain: string;
    classifications: any[];
    intent: string;
    score: number;
    entities?: NlpEntity[];
    sourceEntities?: any[];
    sentiment?: any;
    answer?: string;
}

export interface NlpEntity {
    start: number;
    end: number;
    len: number;
    accuracy: number;
    sourceText: string;
    entity: string;
    utteranceText: string;
}

export interface ExtractedEntities {
    roles: string[];
    levels: string[];
    persons: string[];
    technologies: string[];
}

export class SharedNlpManager {
    private nlpManager: NlpManager;
    private trained = false;
    private readonly isProduction: boolean;

    constructor() {
        this.nlpManager = new NlpManager({
            languages: ['en', 'ru'],
            forceNER: true,
            nlu: { useNoneFeature: false }
        });
        this.isProduction = process.env.NODE_ENV === 'production';
        this.log('🧠 SharedNlpManager initialized');
    }

    /**
     * Обучение NLP модели с предопределенными сущностями
     */
    async train(): Promise<void> {
        if (this.trained) {
            this.log('📚 NLP already trained, skipping...');
            return;
        }

        this.log('🎓 Training NLP model...');
        const startTime = Date.now();

        // Роли QA
        this.addRoleEntities();

        // Уровни опыта
        this.addLevelEntities();

        // Персоны (имена людей)
        this.addPersonEntities();

        // Технологии
        this.addTechnologyEntities();

        await this.nlpManager.train();
        this.trained = true;

        const trainTime = Date.now() - startTime;
        this.log(`🎓 NLP training completed in ${trainTime}ms`);
    }

    /**
     * Основной метод обработки текста
     */
    async process(text: string, language: string = 'en'): Promise<NlpProcessResult> {
        if (!this.trained) {
            await this.train();
        }

        this.log(`🔍 Processing text (${text.length} chars, lang: ${language})`);
        const result = await this.nlpManager.process(language, text);

        this.log(`📊 Found ${result.entities?.length || 0} entities`);
        return result;
    }

    /**
     * Извлечение всех сущностей структурированно
     */
    async extractAllEntities(text: string, language: string = 'en'): Promise<ExtractedEntities> {
        const result = await this.process(text, language);

        if (!result.entities || result.entities.length === 0) {
            return { roles: [], levels: [], persons: [], technologies: [] };
        }

        const entities: ExtractedEntities = {
            roles: this.filterEntitiesByType(result.entities, 'role'),
            levels: this.filterEntitiesByType(result.entities, 'level'),
            persons: this.filterEntitiesByType(result.entities, 'person'),
            technologies: this.filterEntitiesByType(result.entities, 'technology')
        };

        this.log('📋 Extracted entities:', entities);
        return entities;
    }

    /**
     * Специализированный метод для ролей
     */
    async extractRoles(text: string, language: string = 'en'): Promise<string[]> {
        const result = await this.process(text, language);
        const roles = this.filterEntitiesByType(result.entities || [], 'role');

        this.log(`💼 Found ${roles.length} roles: [${roles.join(', ')}]`);
        return roles;
    }

    /**
     * Специализированный метод для уровней
     */
    async extractLevels(text: string, language: string = 'en'): Promise<string[]> {
        const result = await this.process(text, language);
        const levels = this.filterEntitiesByType(result.entities || [], 'level');

        this.log(`📊 Found ${levels.length} levels: [${levels.join(', ')}]`);
        return levels;
    }

    /**
     * Получение сырого NLP менеджера для расширенного использования
     */
    getNlpManager(): NlpManager {
        return this.nlpManager;
    }

    /**
     * Проверка статуса обучения
     */
    isTrained(): boolean {
        return this.trained;
    }

    // ═══════════════════════════════════════════════════════════════
    // PRIVATE: Методы обучения сущностей
    // ═══════════════════════════════════════════════════════════════

    private addRoleEntities(): void {
        this.log('💼 Training role entities...');

        const roles = [
            // Automation roles
            { text: 'QA Automation Engineer', langs: ['en'], synonyms: ['QA Automation Engineer', 'Automation QA Engineer'] },
            { text: 'Test Automation Engineer', langs: ['en'], synonyms: ['Test Automation Engineer', 'Automation Test Engineer'] },
            { text: 'Mobile App Test Automation Engineer', langs: ['en'], synonyms: ['Mobile App Test Automation Engineer'] },

            // Manual roles
            { text: 'Manual QA Engineer', langs: ['en'], synonyms: ['Manual QA Engineer', 'Manual QA Tester', 'QA Manual Engineer'] },
            { text: 'Manual Tester', langs: ['en'], synonyms: ['Manual Tester'] },

            // General roles
            { text: 'QA Engineer', langs: ['en'], synonyms: ['QA Engineer', 'Quality Assurance Engineer'] },
            { text: 'Senior QA Engineer', langs: ['en'], synonyms: ['Senior QA Engineer', 'Senior QA'] },
            { text: 'Lead QA Engineer', langs: ['en'], synonyms: ['Lead QA Engineer', 'QA Lead'] },

            // Specialized roles
            { text: 'SDET', langs: ['en'], synonyms: ['SDET', 'Software Development Engineer in Test'] },
            { text: 'Test Engineer', langs: ['en'], synonyms: ['Test Engineer'] },

            // Russian equivalents
            { text: 'QA инженер', langs: ['ru'], synonyms: ['QA инженер', 'Тестировщик', 'Инженер по тестированию'] },
            { text: 'Автоматизатор тестирования', langs: ['ru'], synonyms: ['Автоматизатор тестирования', 'AQA инженер'] }
        ];

        roles.forEach(role => {
            role.synonyms.forEach(synonym => {
                this.nlpManager.addNamedEntityText('role', synonym, role.langs, [role.text]);
            });
        });
    }

    private addLevelEntities(): void {
        this.log('📊 Training level entities...');

        const levels = [
            { text: 'Senior', langs: ['en', 'ru'], synonyms: ['Senior', 'Senior+', 'Sr', 'Sr.'] },
            { text: 'Middle', langs: ['en', 'ru'], synonyms: ['Middle', 'Mid', 'Middle+', 'Middle-'] },
            { text: 'Junior', langs: ['en', 'ru'], synonyms: ['Junior', 'Jr', 'Jr.', 'Junior+'] },
            { text: 'Lead', langs: ['en', 'ru'], synonyms: ['Lead', 'Team Lead', 'Technical Lead'] }
        ];

        levels.forEach(level => {
            level.synonyms.forEach(synonym => {
                this.nlpManager.addNamedEntityText('level', synonym, level.langs, [level.text]);
            });
        });
    }

    private addPersonEntities(): void {
        this.log('👥 Training person entities...');

        const persons = [
            { text: 'Andrei Robilka', langs: ['en', 'ru'], synonyms: ['Andrei Robilka'] },
            { text: 'Alesia Lahoika', langs: ['en', 'ru'], synonyms: ['Alesia Lahoika'] },
            // Можно добавить больше известных имен из твоей системы
        ];

        persons.forEach(person => {
            person.synonyms.forEach(synonym => {
                this.nlpManager.addNamedEntityText('person', synonym, person.langs, [person.text]);
            });
        });
    }

    private addTechnologyEntities(): void {
        this.log('🔧 Training technology entities...');

        const technologies = [
            { text: 'JavaScript', langs: ['en', 'ru'], synonyms: ['JavaScript', 'JS', 'Node.js'] },
            { text: 'TypeScript', langs: ['en', 'ru'], synonyms: ['TypeScript', 'TS'] },
            { text: 'Java', langs: ['en', 'ru'], synonyms: ['Java'] },
            { text: 'Python', langs: ['en', 'ru'], synonyms: ['Python'] },
            { text: 'Selenium', langs: ['en', 'ru'], synonyms: ['Selenium', 'Selenium WebDriver'] },
            { text: 'Cypress', langs: ['en', 'ru'], synonyms: ['Cypress'] },
            { text: 'Playwright', langs: ['en', 'ru'], synonyms: ['Playwright'] },
            { text: 'Appium', langs: ['en', 'ru'], synonyms: ['Appium'] }
        ];

        technologies.forEach(tech => {
            tech.synonyms.forEach(synonym => {
                this.nlpManager.addNamedEntityText('technology', synonym, tech.langs, [tech.text]);
            });
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // PRIVATE: Утилитарные методы
    // ═══════════════════════════════════════════════════════════════

    private filterEntitiesByType(entities: NlpEntity[], entityType: string): string[] {
        return entities
            .filter(e => e.entity === entityType)
            .map(e => e.sourceText)
            .filter((text, index, self) => self.indexOf(text) === index); // Убираем дубликаты
    }

    private log(message: string, ...args: any[]) {
        if (!this.isProduction) {
            console.log(`[SharedNlpManager] ${message}`, ...args);
        }
    }
}
