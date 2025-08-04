export const objectKeys = [
    "Уровень",
    "ФИО",
    "JS, TS",
    "Java",
    "Python",
    "C#",
    "Kotlin",
    "Ruby",
    "Swift",
    "Performance",
    "Security",
    "Accessibility",
    "Role",
    "Testing Framework",
    "English",
    "German",
    "Polish",
    "Страна",
    "Город",
    "Team Lead"
] as const;

export function arrayToObject<T extends readonly string[]>(
    headers: readonly string[],
    values: T
): Record<typeof headers[number], T[number]> {
    if (headers.length !== values.length) {
        console.error(
            `arrayToObject error: keys length (${headers.length}) does not match values length (${values.length}).`,
            { headers, values }
        );
        throw new Error("Keys and values arrays must have the same length");
    }
    return headers.reduce((obj, key, idx) => {
        obj[key] = values[idx];
        return obj;
    }, {} as Record<typeof headers[number], T[number]>);
}
