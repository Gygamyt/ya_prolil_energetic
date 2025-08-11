import { generateEmployeeExternalId } from "../utils/employee-id.helper";

export const objectKeys = [
    "Grade",
    "Name",
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
    "Country",
    "City",
    "Team Lead"
] as const;

export function arrayToObject(
    headers: readonly string[],
    values: string | any[]
): Record<string, any> {
    if (headers.length !== values.length) {
        console.error(
            `arrayToObject error: keys length (${headers.length}) does not match values length (${values.length}).`,
            { headers, values }
        );
        throw new Error("Keys and values arrays must have the same length");
    }

    const obj = headers.reduce((acc, key, idx) => {
        acc[key] = values[idx];
        return acc;
    }, {} as Record<string, any>);

    const externalId = generateEmployeeExternalId({
        Name: obj.Name,
        Grade: obj.Grade,
        Role: obj.Role
    });

    return {
        externalId,
        ...obj
    };
}
