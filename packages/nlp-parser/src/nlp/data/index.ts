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

const SPECIAL_TECH_SYNONYMS = {
    'TestNG': ['TestNG', 'testng'],
    'JUnit': ['JUnit', 'junit'],
    'nUnit': ['nUnit', 'nunit'],
    'xUnit': ['xUnit', 'xunit'],
    'Mocha': ['Mocha', 'mocha'],
    'Chai': ['Chai', 'chai'],
    'Jest': ['Jest', 'jest'],
    'PyTest': ['PyTest', 'pytest'],
    'CodeceptJS': ['CodeceptJS', 'codeceptjs'],
    'Selenide': ['Selenide', 'selenide'],
    'Robot Framework': ['Robot Framework', 'robot framework', 'robotframework'],
    'TestComplete': ['TestComplete', 'testcomplete'],
    'Cucumber': ['Cucumber', 'cucumber'],
    'Gherkin': ['Gherkin', 'gherkin']
    // можно добавить другие при необходимости
};

function createOptions(categories: Record<string, string[]>): NlpEntityOption[] {
    const options: NlpEntityOption[] = [];

    const canonicalMap: Record<string, string> = {
        'банк': 'Banking',
        'банкинг': 'Banking',
        'финтех': 'Fintech',
        'ооп': 'OOP',
        'ООП': 'OOP',
        'rest': 'REST API',
        'mq': 'Message Queues',
        'микросервисы': 'Microservices'
    };

    for (const categoryName in categories) {
        const keywords = categories[categoryName];

        for (const keyword of keywords) {
            const lowerKeyword = keyword.toLowerCase();
            const canonicalName = canonicalMap[lowerKeyword] || keyword;

            let option = options.find(o => o.name === canonicalName);
            if (!option) {
                // @ts-ignore
                const manualSynonyms = SPECIAL_TECH_SYNONYMS[canonicalName];
                option = {
                    name: canonicalName,
                    alias: categoryName,
                    synonyms: manualSynonyms
                        ? [...manualSynonyms]
                        : [canonicalName, canonicalName.toLowerCase()]
                };
                options.push(option);
                console.log(`Special synonyms for ${canonicalName}:`, manualSynonyms);
                if (manualSynonyms) continue;
            }

            option.synonyms.push(lowerKeyword);

            if (canonicalName === 'Microservices') {
                option.synonyms.push('микросервисной');
            }
            if (canonicalName === 'REST API') {
                option.synonyms.push('rest');
            }

            if (/[а-я]$/.test(lowerKeyword)) {
                option.synonyms.push(lowerKeyword + 'а');
                option.synonyms.push(lowerKeyword + 'е');
                option.synonyms.push(lowerKeyword.slice(0, -1) + 'овский');
            }
        }
    }

    options.forEach(opt => (opt.synonyms = [...new Set(opt.synonyms)]));
    //todo add optional logging

    // options.forEach(opt => {
    //     opt.synonyms = [...new Set(opt.synonyms)];
    //     if (opt.name === 'TestNG') {
    //         console.log(`Synonyms for TestNG after deduplication:`, opt.synonyms);
    //     }
    // });

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
