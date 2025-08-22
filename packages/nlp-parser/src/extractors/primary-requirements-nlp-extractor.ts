// src/extractors/PrimaryRequirementsNLPExtractor.ts

import { ComplexExtractor, ExtractorContext, ExtractionResult } from './base-extractor';
import { processText } from '../nlp/nlp-manager';


export interface PrimaryRequirements {
    technologies: string[];
    platforms: string[];
    skills: string[];
    domains: string[];
    roles: string[];
}

export class PrimaryRequirementsNLPExtractor extends ComplexExtractor {
    fieldName = 'primaryRequirements';

    async extract(text: string, context?: ExtractorContext): Promise<ExtractionResult> {
        const textToProcess = context?.numberedList?.[14] ?? text;

        if (!textToProcess || textToProcess.trim() === 'N/A' || textToProcess.trim() === '') {
            return this.createResult(null, 0, 'nlp');
        }

        const nlpResult = await processText(textToProcess);

        if (nlpResult.entities.length === 0) {
            return this.createResult(null, 0, 'nlp', textToProcess);
        }

        const requirements: PrimaryRequirements = {
            technologies: [], platforms: [], skills: [], domains: [], roles: [],
        };

        // ↓↓↓ ИЗМЕНЕНИЕ 2: УПРОЩАЕМ ЛОГИКУ СБОРКИ ↓↓↓
        for (const entity of nlpResult.entities) {
            // Мы берем только каноничное имя (entity.option) и полностью игнорируем категорию (entity.alias)
            const value: string = entity.option;

            switch (entity.entity) {
                case 'technology': requirements.technologies.push(value); break;
                case 'platform':   requirements.platforms.push(value);   break;
                case 'skill':      requirements.skills.push(value);      break;
                case 'domain':     requirements.domains.push(value);     break;
                case 'role':       requirements.roles.push(value);       break;
            }
        }

        // ↓↓↓ ИЗМЕНЕНИЕ 3: УДАЛЯЕМ ДУБЛИКАТЫ С ПОМОЩЬЮ SET ↓↓↓
        for (const key in requirements) {
            const prop = key as keyof PrimaryRequirements;
            requirements[prop] = [...new Set(requirements[prop])];
        }

        return this.createResult(
            requirements, nlpResult.score, 'nlp', textToProcess,
            { entityCount: nlpResult.entities.length }
        );
    }
}
