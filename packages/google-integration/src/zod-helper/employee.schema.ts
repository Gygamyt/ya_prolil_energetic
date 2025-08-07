import { z } from "zod";
import { CEFRLevel, Grade, NullableFlag, OptionalString, Role, SkillLevel } from "@repo/shared/src/schemas";

export const RawRecordSchema = z.tuple([
    NullableFlag,        // 0: TRUE/FALSE/""
    Grade,               // 1: grade
    z.string(),          // 2: name
    SkillLevel,          // 3: js
    SkillLevel,          // 4: java
    SkillLevel,          // 5: python
    SkillLevel,          // 6: c#
    SkillLevel,          // 7: kotlin
    SkillLevel,          // 8: ruby
    SkillLevel,          // 9: swift
    OptionalString,      // 10: to remove
    SkillLevel,          // 11: performance
    SkillLevel,          // 12: security
    SkillLevel,          // 13: access
    OptionalString,      // 14: to remove
    Role,                // 15: role
    OptionalString,      // 16: to remove
    z.string(),          // 17: name (repeat)
    CEFRLevel,           // 18: eng
    CEFRLevel,           // 19: german
    CEFRLevel,           // 20: polish
    OptionalString,      // 21: to remove
    z.string(),          // 22: team lead
    OptionalString,      // 23: to remove
    z.string(),          // 24: date to company
    z.string(),          // 25: date to bench
]);

export const RowSchema = z.object({
    "Языки программирования": z.string(),
    "Типы тестирования": z.string(),
    "Позиция": z.string(),
    "Основной стек": z.string(),
    "Язык": z.string(),
    "Локация": z.string(),
    "M": z.string(),
    "Дата выхода": z.string(),
    "0": z.string(),
    "Уровень": z.string(),
    "ФИО": z.string(),
    "JS, TS": z.string(),
    "Java": z.string(),
    "Python": z.string(),
    "C#": z.string(),
    "Kotlin": z.string(),
    "Ruby": z.string(),
    "Swift": z.string(),
    "Performance": z.string(),
    "Security": z.string(),
    "Accessibility": z.string(),
    "Role": z.string(),
    "Testing Framework": z.string(),
    "English": z.string(),
    "German": z.string(),
    "Polish": z.string(),
    "Страна": z.string(),
    "Город": z.string(),
    "Team Lead": z.string(),
    "В штат": z.string(),
    "На бенч": z.string(),
});
