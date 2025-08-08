import { z } from "zod";

export const NullableFlag = z
    .enum(["TRUE", "FALSE", ""])
    .transform(v => v === "TRUE");
export const Grade = z.enum(["Intern", "Junior", "Middle", "Senior", "No"]);
export const SkillLevel = z.enum(["Low", "Medium", "High", "No", "On check"]);
export const OptionalString = z.string().optional();
export const BooleanString = z
    .enum(["Yes", "No", ""])
    .transform(v => v === "Yes");
export const Role = z.enum(["AQA", "Fullstack"]);
export const CEFRLevel = z.enum(["A1", "A2", "B1", "B2", "C1", "C2", "No"]);

export const cleanEmployeeObjectSchema = z.object({
    'Уровень': Grade,
    'ФИО': z.string(),
    'JS, TS': SkillLevel,
    'Java': SkillLevel,
    'Python': SkillLevel,
    'C#': SkillLevel,
    'Kotlin': SkillLevel,
    'Ruby': SkillLevel,
    'Swift': SkillLevel,
    'Performance': SkillLevel,
    'Security': SkillLevel,
    'Accessibility': SkillLevel,
    'Role': Role,
    'Testing Framework': z.string(),
    'English': CEFRLevel,
    'German': CEFRLevel,
    'Polish': CEFRLevel,
    'Страна': z.string(),
    'Город': z.string(),
    'Team Lead': z.string(),
});
