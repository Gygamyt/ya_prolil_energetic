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
    externalId: z.string().min(1).describe('Unique external identifier generated from stable fields'),
    Grade: Grade,
    Name: z.string().min(1),
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
    'Testing Framework': OptionalString,
    'English': CEFRLevel,
    'German': CEFRLevel,
    'Polish': CEFRLevel,
    'Country': OptionalString,
    'City': OptionalString,
    'Team Lead': OptionalString,
});


export const EmployeeSchema = z.object({
    _id: z.string().optional(),
    externalId: z.string(),
    Name: z.string(),
    Grade: z.enum(['Junior', 'Middle', 'Senior', 'Lead']),
    Role: z.enum(['Fullstack', 'Frontend', 'Backend', 'Mobile', 'DevOps', 'QA', 'AQA']),
    'JS, TS': z.enum(['No', 'Low', 'Medium', 'High']),
    'Java': z.enum(['No', 'Low', 'Medium', 'High']),
    'Python': z.enum(['No', 'Low', 'Medium', 'High']),
    'C#': z.enum(['No', 'Low', 'Medium', 'High']),
    'Kotlin': z.enum(['No', 'Low', 'Medium', 'High']),
    'Ruby': z.enum(['No', 'Low', 'Medium', 'High']),
    'Swift': z.enum(['No', 'Low', 'Medium', 'High']),
    'Performance': z.enum(['No', 'Low', 'Medium', 'High']),
    'Security': z.enum(['No', 'Low', 'Medium', 'High']),
    'Accessibility': z.enum(['No', 'Low', 'Medium', 'High']),
    'Testing Framework': z.string(),
    'English': z.enum(['No', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']),
    'German': z.enum(['No', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']),
    'Polish': z.enum(['No', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']),
    'Country': z.string(),
    'City': z.string(),
    'Team Lead': z.string()
});

export type Employee = z.infer<typeof EmployeeSchema>;

export const EmployeeSearchCriteriaSchema = z.object({
    skills: z.array(z.string()).optional(),
    minSkillLevel: z.enum(['Low', 'Medium', 'High']).optional(),
    grades: z.array(z.enum(['Junior', 'Middle', 'Senior', 'Lead'])).optional(),
    roles: z.array(z.enum(['Fullstack', 'Frontend', 'Backend', 'Mobile', 'DevOps', 'QA', 'AQA'])).optional(),
    languages: z.array(z.string()).optional(),
    minLanguageLevel: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).optional(),
    countries: z.array(z.string()).optional(),
    cities: z.array(z.string()).optional(),
    teamLeads: z.array(z.string()).optional()
});

export type EmployeeSearchCriteria = z.infer<typeof EmployeeSearchCriteriaSchema>;

// Analysis result schema
export const EmployeeAnalysisSchema = z.object({
    totalEmployees: z.number(),
    matchingEmployees: z.array(EmployeeSchema),
    skillsDistribution: z.record(z.record(z.number())),
    gradeDistribution: z.record(z.number()),
    roleDistribution: z.record(z.number()),
    locationDistribution: z.record(z.number()),
    recommendations: z.array(z.string()),
    insights: z.array(z.string())
});

export type EmployeeAnalysis = z.infer<typeof EmployeeAnalysisSchema>;
