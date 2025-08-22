import { describe, it, expect, beforeEach } from 'vitest';
import { LocationExtractor, Location } from '../location-extractor';
import { ExtractorContext } from '../base-extractor';

describe('LocationExtractor', () => {
    let extractor: LocationExtractor;

    beforeEach(() => {
        extractor = new LocationExtractor();
    });

    const createTestContext = (p24?: string): ExtractorContext => ({
        numberedList: { ...(p24 && { 24: p24 }) },
    } as any);

    const runExtract = async (context: ExtractorContext) => {
        const result = await extractor.extract('', context);
        return result.value as Location | null;
    };

    it('should extract a single region and work type', async () => {
        const context = createTestContext('РФ, Remote');
        const result = await runExtract(context);
        expect(result?.regions).toEqual(['RU']);
        expect(result?.workType).toBe('Remote');
    });

    it('should handle multiple regions with a plus separator', async () => {
        const context = createTestContext('EU+Georgia, Hybrid');
        const result = await runExtract(context);
        expect(result?.regions).toEqual(['EU', 'GE']);
        expect(result?.workType).toBe('Hybrid');
    });

    it('should handle the "No restrictions" case', async () => {
        const context = createTestContext('No restrictions');
        const result = await runExtract(context);
        expect(result?.isGlobal).toBe(true);
        expect(result?.regions).toEqual([]);
    });

    it('should extract a single country like Armenia', async () => {
        const context = createTestContext('Армения');
        const result = await runExtract(context);
        expect(result?.regions).toEqual(['AM']);
    });

    it('should return null if field 24 is missing or empty', async () => {
        const context = createTestContext('');
        const result = await runExtract(context);
        expect(result).toBe(null);
    });

    it('should set region to RU if "дружественные страны" is present', async () => {
        const context = createTestContext('дружественные страны');
        const result = await runExtract(context);
        expect(result?.regions).toEqual(['RU']);
    });

    it('should override other regions with RU if "дружественные страны" is present', async () => {
        const context = createTestContext('Армения + дружественные страны');
        const result = await runExtract(context);
        expect(result?.regions).toEqual(['RU']); // Армения игнорируется
    });
});
