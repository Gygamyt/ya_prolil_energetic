// packages/nlp-parser/src/services/batch.processor.ts
import { NLPParser } from '../parsers/nlp.parser';
import { ParseResult } from '../types';
import fs from 'fs/promises';
import { WordDocumentParser } from "../scripts/word-document.parser";

/**
 * Batch processor for parsing large arrays of Salesforce requests.
 * Handles concurrent parsing with progress tracking and error handling.
 */
export class NLPBatchProcessor {
    private parser: NLPParser;
    private wordParser: WordDocumentParser;

    constructor() {
        this.parser = new NLPParser();
        this.wordParser = new WordDocumentParser();
    }

    /**
     * Processes Salesforce requests from Word document.
     * @param wordFilePath - Path to Word document with requests
     * @param concurrency - Max parallel parsing operations
     * @returns Array of parsed results
     */
    async processWordDocument(wordFilePath: string, concurrency = 5): Promise<ParseResult[]> {
        console.log(`📄 Processing Word document: ${wordFilePath}`);

        // Extract requests from Word document
        const requests = await this.wordParser.extractRequestsFromWord(wordFilePath);

        if (requests.length === 0) {
            console.log('⚠️ No valid requests found in document');
            return [];
        }

        // Save extracted requests for debugging
        await this.wordParser.saveRequestsForDebug(requests);

        // ✅ Process with normalization enabled for Word docs
        return this.parseBatchWithOptions(requests, { normalize: true }, concurrency);
    }

    /**
     * Processes multiple inputs with custom options.
     * @param inputs - Array of raw text inputs
     * @param parseOptions - Options to pass to parse method
     * @param concurrency - Max parallel executions
     * @returns Array of parsed results
     */
    async parseBatchWithOptions(
        inputs: string[],
        parseOptions: { normalize?: boolean } = {},
        concurrency = 5
    ): Promise<ParseResult[]> {
        console.log(`🚀 Starting batch processing of ${inputs.length} requests...`);

        const results: ParseResult[] = new Array(inputs.length);
        let completed = 0;
        let index = 0;

        const workers = Array.from({ length: Math.min(concurrency, inputs.length) }, async (_, workerId) => {
            while (index < inputs.length) {
                const current = index++;
                const inputText = inputs[current].trim();

                if (!inputText) {
                    results[current] = this.createEmptyResult();
                    completed++;
                    continue;
                }

                try {
                    console.log(`👤 Worker ${workerId + 1}: Processing request ${current + 1}/${inputs.length}`);
                    // ✅ Pass options to parse method
                    results[current] = await this.parser.parse(inputText, parseOptions);

                    completed++;
                    if (completed % 10 === 0) {
                        console.log(`✅ Progress: ${completed}/${inputs.length} completed`);
                    }
                } catch (error) {
                    // @ts-ignore
                    console.error(`❌ Error processing request ${current + 1}:`, error.message);
                    results[current] = {
                        success: false,
                        confidence: 0,
                        strategy: 'nlp',
                        extractedFields: [],
                        data: undefined,
                        // @ts-ignore
                        error: error.message || 'Unknown parsing error'
                    };
                    completed++;
                }
            }
        });

        await Promise.all(workers);
        console.log(`🎉 Batch processing completed: ${completed}/${inputs.length} processed`);

        return results;
    }


    // ═══════════════════════════════════════════════════════════════════════════════════
    // BATCH PROCESSING
    // ═══════════════════════════════════════════════════════════════════════════════════

    /**
     * Processes multiple Salesforce requests concurrently with controlled concurrency.
     * @param inputs - Array of raw Salesforce request texts
     * @param concurrency - Max parallel executions (default: 15)
     * @returns Array of parsed results with progress tracking
     */
    async parseBatch(inputs: string[], concurrency = 15): Promise<ParseResult[]> {
        return this.parseBatchWithOptions(inputs, {}, concurrency);
    }

    // ═══════════════════════════════════════════════════════════════════════════════════
    // DATA ANALYSIS & EXPORT
    // ═══════════════════════════════════════════════════════════════════════════════════

    /**
     * Analyzes batch processing results and generates statistics.
     * @param results - Array of parse results
     * @returns Analysis summary with stats and insights
     */
    analyzeBatchResults(results: ParseResult[]) {
        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);

        const fieldStats = this.analyzeFieldExtraction(successful);
        const confidenceStats = this.analyzeConfidence(successful);
        const errorStats = this.analyzeErrors(failed);

        return {
            total: results.length,
            successful: successful.length,
            failed: failed.length,
            successRate: (successful.length / results.length * 100).toFixed(2) + '%',
            avgConfidence: confidenceStats.average,
            fieldStats,
            confidenceStats,
            errorStats
        };
    }

    /**
     * Exports successful parsing results to JSON file.
     * @param results - Parse results to export
     * @param filename - Output filename (optional)
     * @param outputDir - Output directory (default: '../temp')
     */
    async exportToJson(results: ParseResult[], filename = 'salesforce-parsed-data.json', outputDir = '../temp') {
        const successfulData = results
            .filter(r => r.success && r.data)
            .map(r => r.data);

        // Create output directory if it doesn't exist
        await fs.mkdir(outputDir, { recursive: true });

        const fullPath = `${outputDir}/${filename}`;
        await fs.writeFile(fullPath, JSON.stringify(successfulData, null, 2));
        console.log(`📄 Exported ${successfulData.length} parsed records to ${fullPath}`);
    }

    /**
     * Exports analysis results to CSV for further analysis.
     * @param results - Parse results to analyze
     * @param filename - Output CSV filename (optional)
     * @param outputDir - Output directory (default: '../temp')
     */
    async exportToCSV(results: ParseResult[], filename = 'salesforce-analysis.csv', outputDir = '../temp') {
        const csvRows = ['Index,Success,Confidence,ExtractedFields,Role,Industry,TeamSize,SalesManager'];

        results.forEach((result, index) => {
            const row = [
                index + 1,
                result.success,
                result.confidence || 0,
                result.extractedFields?.join(';') || '',
                result.data?.role || '',
                result.data?.industry || '',
                result.data?.teamSize || '',
                result.data?.salesManager || ''
            ].map(field => `"${field}"`).join(',');

            csvRows.push(row);
        });

        // Create output directory if it doesn't exist
        await fs.mkdir(outputDir, { recursive: true });

        const fullPath = `${outputDir}/${filename}`;
        await fs.writeFile(fullPath, csvRows.join('\n'));
        console.log(`📊 Exported analysis to ${fullPath}`);
    }

    /**
     * Creates a timestamped export directory for organizing results.
     * @param baseDir - Base directory (default: '../temp')
     * @returns Path to the created timestamped directory
     */
    private createTimestampedDir(baseDir = '../temp'): string {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const timeOnly = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
        return `${baseDir}/batch-${timestamp}-${timeOnly}`;
    }

    /**
     * Exports all results with automatic timestamped directory creation.
     * @param results - Parse results to export
     * @param baseDir - Base directory for exports (default: '../temp')
     */
    async exportAll(results: ParseResult[], baseDir = '../temp') {
        const outputDir = this.createTimestampedDir(baseDir);

        console.log(`📁 Creating export directory: ${outputDir}`);

        // Export JSON data
        await this.exportToJson(results, 'parsed-data.json', outputDir);

        // Export CSV analysis
        await this.exportToCSV(results, 'analysis.csv', outputDir);

        // Export training data
        const trainingData = this.extractTrainingData(results);
        await fs.mkdir(outputDir, { recursive: true });
        await fs.writeFile(
            `${outputDir}/training-data.json`,
            JSON.stringify(trainingData, null, 2)
        );

        // Export summary stats
        const analysis = this.analyzeBatchResults(results);
        await fs.writeFile(
            `${outputDir}/summary-stats.json`,
            JSON.stringify(analysis, null, 2)
        );

        console.log(`✅ All exports completed in: ${outputDir}`);
        return outputDir;
    }

    // ═══════════════════════════════════════════════════════════════════════════════════
    // TRAINING DATA EXTRACTION
    // ═══════════════════════════════════════════════════════════════════════════════════

    /**
     * Extracts unique entities from successful parses for NLP training improvement.
     * @param results - Parse results to analyze
     * @returns Structured training data suggestions
     */
    extractTrainingData(results: ParseResult[]) {
        const trainingData = {
            persons: new Set<string>(),
            roles: new Set<string>(),
            industries: new Set<string>(),
            levels: new Set<string>()
        };

        results
            .filter(r => r.success && r.data)
            .forEach(result => {
                const data = result.data!;

                if (data.salesManager) trainingData.persons.add(data.salesManager);
                if (data.coordinator) trainingData.persons.add(data.coordinator);
                if (data.role) trainingData.roles.add(data.role);
                if (data.industry) trainingData.industries.add(data.industry);
                if (data.levels) data.levels.forEach(level => trainingData.levels.add(level));
            });

        return {
            persons: Array.from(trainingData.persons),
            roles: Array.from(trainingData.roles),
            industries: Array.from(trainingData.industries),
            levels: Array.from(trainingData.levels)
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════════════
    // UTILITY METHODS
    // ═══════════════════════════════════════════════════════════════════════════════════

    private createEmptyResult(): ParseResult {
        return {
            success: false,
            confidence: 0,
            strategy: 'nlp',
            extractedFields: [],
            data: undefined,
            error: 'Empty input'
        };
    }

    private analyzeFieldExtraction(successful: ParseResult[]) {
        const fieldCounts: Record<string, number> = {};

        successful.forEach(result => {
            result.extractedFields.forEach(field => {
                fieldCounts[field] = (fieldCounts[field] || 0) + 1;
            });
        });

        return Object.entries(fieldCounts)
            .sort(([,a], [,b]) => b - a)
            .map(([field, count]) => ({
                field,
                count,
                percentage: (count / successful.length * 100).toFixed(1) + '%'
            }));
    }

    private analyzeConfidence(successful: ParseResult[]) {
        const confidences = successful.map(r => r.confidence);
        const average = confidences.reduce((a, b) => a + b, 0) / confidences.length;

        return {
            average: Number(average.toFixed(3)),
            min: Math.min(...confidences),
            max: Math.max(...confidences),
            distribution: {
                high: confidences.filter(c => c >= 0.8).length,
                medium: confidences.filter(c => c >= 0.5 && c < 0.8).length,
                low: confidences.filter(c => c < 0.5).length
            }
        };
    }

    private analyzeErrors(failed: ParseResult[]) {
        const errorCounts: Record<string, number> = {};

        failed.forEach(result => {
            const error = result.error || 'Unknown error';
            errorCounts[error] = (errorCounts[error] || 0) + 1;
        });

        return Object.entries(errorCounts)
            .sort(([,a], [,b]) => b - a)
            .map(([error, count]) => ({ error, count }));
    }
}
