import { TechnologyConfig } from "../types";

export class TechnologyExtractor {
    private config: TechnologyConfig;

    constructor(config: TechnologyConfig = {}) {
        this.config = {
            languages: config.languages || [
                'Java', 'JavaScript', 'TypeScript', 'Python', 'C#', 'Kotlin', 'Swift',
                'SQL', 'HTML', 'CSS', 'PHP', 'Ruby', 'Go', 'Rust'
            ],
            frameworks: config.frameworks || [
                'React', 'Angular', 'Vue.js', 'Node.js', 'Spring', 'Express',
                'Django', 'Flask', 'Selenium', 'Cypress', 'Playwright', 'TestNG',
                'JUnit', 'Cucumber', 'Robot Framework', 'Appium'
            ],
            databases: config.databases || [
                'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Oracle', 'MS SQL',
                'SQLite', 'DynamoDB', 'Elasticsearch', 'Cassandra'
            ],
            tools: config.tools || [
                'Postman', 'Swagger', 'Jira', 'Confluence', 'Git', 'Jenkins',
                'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'SoapUI'
            ],
            platforms: config.platforms || [
                'Android', 'iOS', 'Web', 'Mobile', 'Desktop', 'API', 'REST',
                'GraphQL', 'SOAP', 'Microservices'
            ]
        };
    }

    extractTechnologies(text: string): {
        required: string[];
        preferred: string[];
        leadership: string[];
    } {
        const allTech = [
            ...this.config.languages!,
            ...this.config.frameworks!,
            ...this.config.databases!,
            ...this.config.tools!,
            ...this.config.platforms!
        ];

        const found = new Set<string>();

        allTech.forEach(tech => {
            const pattern = new RegExp(`\\b${tech.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
            if (pattern.test(text)) {
                found.add(tech);
            }
        });
        const required: string[] = [];
        const preferred: string[] = [];
        const leadership: string[] = [];

        found.forEach(tech => {
            const requiredPattern = new RegExp(`(?:требования|required|must have|обязательно).*${tech}`, 'i');
            const preferredPattern = new RegExp(`(?:желательно|preferred|nice to have|будет плюсом).*${tech}`, 'i');
            const leadershipPattern = new RegExp(`(?:lead|лидер|mentor|наставник).*${tech}`, 'i');

            if (requiredPattern.test(text)) {
                required.push(tech);
            } else if (preferredPattern.test(text)) {
                preferred.push(tech);
            } else if (leadershipPattern.test(text)) {
                leadership.push(tech);
            } else {
                required.push(tech); // По умолчанию в required
            }
        });

        return { required, preferred, leadership };
    }
}