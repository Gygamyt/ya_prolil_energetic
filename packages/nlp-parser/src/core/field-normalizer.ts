/**
 * Field normalizer: converts values to final format
 */
export class FieldNormalizer {
    /**
     * Normalize field value, converting empty/null to N/A
     */
    static normalize(value: any): any {
        if (
            value === undefined ||
            value === null ||
            (typeof value === "string" && value.trim() === "") ||
            value === "-" ||
            value === "No data"
        ) {
            return "N/A";
        }
        return value;
    }

    /**
     * Normalize entire result object
     */
    static normalizeResult(result: Partial<any>): Partial<any> {
        const normalized: any = {};
        for (const [key, value] of Object.entries(result)) {
            normalized[key] = this.normalize(value);
        }
        return normalized;
    }
}
