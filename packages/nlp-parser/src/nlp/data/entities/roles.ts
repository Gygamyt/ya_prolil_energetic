// export const ROLES: string[] = [
//     'Developer',
//     'QA Engineer',
//     'Automation QA',
//     'Penetration Tester',
//     'SDET',
//     'TestOps',
//     'Manual QA',
//     'Lead', 'Automation Infrastructure Technical Lead',
//     'Test Automation Engineer',
//     'Automation Tester',
//     'Test Lead', 'Automation QA Engineer',
//     'Junior Automation QA Engineer',
//     'Business Analyst', 'Fullstack QA',
//     'Backend QA',
//     'Senior QA Engineer',
//     'Lead QA Engineer', 'Test Analyst',
//     'Hands-on Lead', 'Manual QA Engineer', 'Lead QA Automation Engineer',
//     'Mid-level QA Engineer', 'DevOps', 'Mobile QA Tester', 'Quality- / Test-Engineer',
//     'Tester', 'IT Security Specialist',
//     'Full-Stack QA',
//     'Macro Specialist',
//     'Scraper Specialist',
//     'Fullstack Software Developer in Test', 'AQA'
// ];

export const ROLES = {
    development: [
        'Developer',
        'Fullstack Software Developer in Test'
    ],
    quality_assurance: [
        'QA Engineer', // Основная роль
        'Automation QA', 'AQA', // Синонимы для автоматизатора
        'Test Automation Engineer',
        'Automation Tester',
        'Manual QA', // Явно выделяем мануальную роль
        'Manual QA Engineer',
        'Fullstack QA', 'Backend QA',
        'Mobile QA Tester',
        'Tester', // Общий термин
        'SDET' // Software Development Engineer in Test
    ],
    qa_management: [
        'Test Lead', // Явная руководящая роль
        'Automation Infrastructure Technical Lead', // Очень специфичная, но руководящая
        'Hands-on Lead'
    ],
    analysis_and_specialized: [
        'Business Analyst',
        'Test Analyst',
        'Macro Specialist',
        'Scraper Specialist'
    ],
    security_and_ops: [
        'Penetration Tester',
        'IT Security Specialist',
        'TestOps',
        'DevOps'
    ]
};

