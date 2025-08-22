/**
 * Confidence evaluator: aggregates field confidences into final score
 */
export class ConfidenceEvaluator {
    /**
     * Aggregate field confidences using weighted average
     * Critical fields can have higher weights in the future
     */
    static aggregate(fieldConfidences: Record<string, number>): number {
        const values = Object.values(fieldConfidences);
        if (!values.length) return 0;
        return values.reduce((a, b) => a + b, 0) / values.length;
    }

    /**
     * Evaluate confidence for a single field based on extraction method
     */
    static evaluateField(value: any, extractionMethod: 'regex' | 'nlp' | 'hybrid' | 'pattern'): number {
        if (value === null || value === undefined || value === "N/A") return 0;

        return {
            regex: 0.9,
            nlp: 0.7,
            hybrid: 0.8,
            pattern: 0.85
        }[extractionMethod];
    }
}
