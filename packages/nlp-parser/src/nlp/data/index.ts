// src/nlp-data/index.ts

import { ROLES, PLATFORMS, SKILLS, TECHNOLOGIES, DOMAINS } from './entities';

interface NlpEntityOption {
    name: string;
    alias: string;
    synonyms: string[];
}

interface NlpEntity {
    name: string;
    languages: string[];
    options: NlpEntityOption[];
}

function createOptions(categories: Record<string, string[]>): NlpEntityOption[] {
    const options: NlpEntityOption[] = [];

    // ↓↓↓ ИЗМЕНЕНИЕ 1: РАСШИРЯЕМ КАРТУ КАНОНИЧНЫХ ИМЕН ↓↓↓
    const canonicalMap: Record<string, string> = {
        'банк': 'Banking',
        'банкинг': 'Banking',
        'финтех': 'Fintech',
        'ооп': 'OOP',
        'ООП': 'OOP',
        'rest': 'REST API',
        'mq': 'Message Queues',
        'микросервисы': 'Microservices',
    };

    for (const categoryName in categories) {
        const keywords = categories[categoryName];

        for (const keyword of keywords) {
            const lowerKeyword = keyword.toLowerCase();
            // Используем карту для определения каноничного имени
            const canonicalName = canonicalMap[lowerKeyword] || keyword;

            let option = options.find(o => o.name === canonicalName);
            if (!option) {
                option = {
                    name: canonicalName,
                    alias: categoryName,
                    synonyms: [canonicalName, canonicalName.toLowerCase()],
                };
                options.push(option);
            }

            // Добавляем текущее слово в синонимы
            option.synonyms.push(lowerKeyword);

            // ↓↓↓ ИЗМЕНЕНИЕ 2: ДОБАВЛЯЕМ КОНКРЕТНЫЕ ПРАВИЛА ДЛЯ СИНОНИМОВ ↓↓↓
            if (canonicalName === 'Microservices') {
                option.synonyms.push('микросервисной'); // Добавляем падеж
            }
            if (canonicalName === 'REST API') {
                option.synonyms.push('rest'); // Добавляем короткую форму
            }

            // Общая логика для русских падежей
            if (/[а-я]$/.test(lowerKeyword)) {
                option.synonyms.push(lowerKeyword + 'а');
                option.synonyms.push(lowerKeyword + 'е');
                option.synonyms.push(lowerKeyword.slice(0, -1) + 'овский');
            }
        }
    }

    options.forEach(opt => (opt.synonyms = [...new Set(opt.synonyms)]));
    return options;
}
const nlpEntities: NlpEntity[] = [
    { name: 'technology', languages: ['ru', 'en'], options: createOptions(TECHNOLOGIES) },
    { name: 'platform', languages: ['ru', 'en'], options: createOptions(PLATFORMS) },
    { name: 'skill', languages: ['ru', 'en'], options: createOptions(SKILLS) },
    { name: 'domain', languages: ['ru', 'en'], options: createOptions(DOMAINS) },
    { name: 'role', languages: ['ru', 'en'], options: createOptions(ROLES) }
];

export { nlpEntities };
