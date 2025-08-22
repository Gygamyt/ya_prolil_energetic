import { ComplexExtractor, ExtractorContext, ExtractionResult } from './base-extractor';
import { processText } from '../nlp/nlp-manager';
import {shouldKeepEntity} from "../nlp/utils/confusion-filter";

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

        for (const entity of nlpResult.entities) {
            const value: string = entity.option;

            if (value === "TestNG") {
                const check = shouldKeepEntity("TestNG", ["test", "testing", "tester"], textToProcess);
                if (!check.allow) {
                    console.log(check.reason);
                    continue; // не добавляем в технологии
                }
            }


            switch (entity.entity) {
                case 'technology': requirements.technologies.push(value); break;
                case 'platform':   requirements.platforms.push(value);   break;
                case 'skill':      requirements.skills.push(value);      break;
                case 'domain':     requirements.domains.push(value);     break;
                case 'role':       requirements.roles.push(value);       break;
            }
        }

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
