// packages/ai-processing/src/parsers/__tests__/test-data.ts

export const SALESFORCE_TEST_REQUESTS = {
    // Базовые случаи
    empty: '',

    singleField: `
6. Уровень разработчиков
Senior
  `.trim(),

    twoFields: `
6. Уровень разработчиков
Middle
12. Запрошенное количество сотрудников
3
  `.trim(),

    threeFields: `
6. Уровень разработчиков
Senior
8. Min уровень английского языка
B2
12. Запрошенное количество сотрудников
2
  `.trim(),

    withMetadata: `
1. Индустрия проекта
Information Technologies
6. Уровень разработчиков
Middle+
12. Запрошенное количество сотрудников
1
22. Сейлс менеджер
Dzmitry Kastsiuk
  `.trim(),

    complexLanguages: `
6. Уровень разработчиков
Senior
8. Min уровень английского языка
B2+ English required, Spanish C1 preferred
12. Запрошенное количество сотрудников
1
  `.trim(),

    locationWithTimezone: `
6. Уровень разработчиков
Senior
12. Запрошенное количество сотрудников
1
24. Требуемая локация специалиста (-ов)
Remote (EST time zone alignment until 11 am Central)
  `.trim(),

    experienceAndLeadership: `
6. Уровень разработчиков
Senior
12. Запрошенное количество сотрудников
1
14. Подробные требования к разработчику
Lead QA Engineer with 8+ years of experience and 3+ years in leadership role.
Main Responsibilities:
- Lead team of 5+ QA engineers
- Establish testing processes and mentoring
33. Первичный запрос
We need a strong leader with 10+ years total experience.
  `.trim(),

    // Полный комплексный запрос - уже был определен

    // Edge cases
    malformed: `
6. Уровень разработчиков
UnknownLevel;InvalidLevel
8. Min уровень английского языка
Z9+ SomeRandomLanguage
12. Запрошенное количество сотрудников
NotANumber
20. Срок отправки заказчику
InvalidDate
  `.trim(),

    unstructured: `
Hello, we are looking for a senior QA engineer with good English skills.
The candidate should have experience in test automation and be able to work remotely.
We need someone with 5+ years of experience in software testing.
The position is for our European office and requires knowledge of JavaScript.
Please send us resumes of suitable candidates as soon as possible.
  `.trim(),

    partiallyCorrect: `
Some random text before...

6. Уровень разработчиков
Senior
Invalid field here
8. Min уровень английского языка
B2
More random text...
12. Запрошенное количество сотрудников
3
  `.trim()
};
