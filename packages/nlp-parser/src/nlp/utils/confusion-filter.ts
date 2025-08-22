export interface ConfusionCheckResult {
    allow: boolean;
    matchedConfusion?: string;
    reason?: string;
}

export function shouldKeepEntity(
    canonicalName: string,
    confusions: string[],
    sourceText: string
): ConfusionCheckResult {
    const lowerText = sourceText.toLowerCase();

    for (const word of confusions) {
        const regex = new RegExp(`\\b${word.toLowerCase()}\\b`, 'i');
        if (regex.test(lowerText)) {
            return {
                allow: false,
                matchedConfusion: word,
                reason: `🚫 "${canonicalName}" может быть спутан с "${word}" в тексте`
            };
        }
    }

    return { allow: true };
}
