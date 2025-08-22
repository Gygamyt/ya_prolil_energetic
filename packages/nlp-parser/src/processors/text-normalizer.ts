/**
 * Text normalizer: cleans and standardizes input text
 */
export class TextNormalizer {
    /**
     * Normalize input text for consistent parsing
     */
    static normalize(text: string): string {
        if (!text) {
            return '';
        }

        return text
            // Remove BOM and normalize unicode
            .replace(/^\uFEFF/, '')
            .normalize('NFC')
            // Standardize line breaks
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            // Remove excessive whitespace
            .replace(/[ \t]+/g, ' ')
            .replace(/\n\s*\n\s*\n/g, '\n\n')
            // Clean up bullet points and numbers
            .replace(/^\s*[•·▪▫-]\s*/gm, '- ')
            .replace(/^\s*(\d+)[.)]\s*/gm, '$1. ')
            // Normalize quotes and dashes
            .replace(/"/g, '"')
            .replace(/'/g, "'")
            .replace(/—/g, '-')
            .replace(/–/g, '-')
            // Trim each line
            .split('\n')
            .map(line => line.trim())
            .join('\n')
            .trim();
    }

    /**
     * Clean text for pattern matching (more aggressive)
     */
    static cleanForMatching(text: string): string {
        const normalized = this.normalize(text);

        return normalized
            // Remove extra punctuation
            .replace(/[^\w\s\-\.\,\:\;\(\)\/]/g, '')
            // Normalize spacing around punctuation
            .replace(/\s*([\.,:;])\s*/g, '$1 ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Extract clean lines from text
     */
    static getLines(text: string): string[] {
        return this.normalize(text)
            .split('\n')
            .filter(line => line.length > 0);
    }

    /**
     * Remove HTML tags if present
     */
    static stripHtml(text: string): string {
        return text.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ');
    }
}
