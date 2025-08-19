import mammoth from 'mammoth';
import fs from 'fs/promises';

/**
 * Parser for extracting Salesforce requests from Word documents.
 * Handles page breaks and splits content into individual requests.
 */
export class WordDocumentParser {

    // ═══════════════════════════════════════════════════════════════════════════════════
    // DOCUMENT PARSING
    // ═══════════════════════════════════════════════════════════════════════════════════

    /**
     * Extracts individual Salesforce requests from Word document.
     * Each page is treated as a separate request.
     * @param filePath - Path to the Word document
     * @returns Array of extracted text requests
     */
    async extractRequestsFromWord(filePath: string): Promise<string[]> {
        console.log(`📄 Reading Word document: ${filePath}`);

        try {
            // Read Word document and convert to HTML to preserve structure
            const result = await mammoth.convertToHtml({ path: filePath });

            if (result.messages.length > 0) {
                console.warn('⚠️ Document conversion warnings:', result.messages);
            }

            // Split by page breaks (Word converts them to specific patterns)
            const requests = this.splitByPageBreaks(result.value);

            console.log(`✅ Extracted ${requests.length} requests from document`);
            return requests;

        } catch (error) {
            console.error('❌ Error reading Word document:', error);
            // @ts-ignore
            throw new Error(`Failed to parse Word document: ${error.message}`);
        }
    }

    /**
     * Alternative method using plain text extraction (faster but loses formatting).
     * @param filePath - Path to the Word document
     * @returns Array of extracted text requests
     */
    async extractRequestsAsPlainText(filePath: string): Promise<string[]> {
        console.log(`📄 Reading Word document as plain text: ${filePath}`);

        try {
            const result = await mammoth.extractRawText({ path: filePath });

            // Split by common page break indicators in plain text
            const requests = this.splitPlainTextByPages(result.value);

            console.log(`✅ Extracted ${requests.length} requests as plain text`);
            return requests;

        } catch (error) {
            console.error('❌ Error reading Word document:', error);
            // @ts-ignore
            throw new Error(`Failed to parse Word document: ${error.message}`);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════════════
    // TEXT SPLITTING METHODS
    // ═══════════════════════════════════════════════════════════════════════════════════

    /**
     * Splits HTML content by page break indicators.
     * @param htmlContent - HTML content from Word document
     * @returns Array of individual requests
     */
    private splitByPageBreaks(htmlContent: string): string[] {
        // Remove HTML tags and split by page break patterns
        let plainText = htmlContent
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
            .replace(/&amp;/g, '&') // Decode HTML entities
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>');

        // Split by various page break indicators
        const requests = this.splitPlainTextByPages(plainText);

        return requests
            .map(request => request.trim())
            .filter(request => request.length > 50) // Filter out very short content
            .filter(request => this.looksLikeSalesforceRequest(request));
    }

    /**
     * Splits plain text by page indicators and common patterns.
     * @param text - Plain text content
     * @returns Array of individual requests
     */
    private splitPlainTextByPages(text: string): string[] {
        // Try different splitting strategies

        // Strategy 1: Split by form feed characters (page breaks)
        let requests = text.split(/\f+/).filter(Boolean);

        if (requests.length < 2) {
            // Strategy 2: Split by multiple consecutive line breaks (indicating page separation)
            requests = text.split(/\n\s*\n\s*\n+/).filter(Boolean);
        }

        if (requests.length < 2) {
            // Strategy 3: Split by repeating patterns that indicate new requests
            requests = text.split(/(?=CV\s*-\s*[A-Z]+\s*-)|(?=\d+\.\s*Индустрия\s*проекта)/).filter(Boolean);
        }

        if (requests.length < 2) {
            // Strategy 4: Split by URL patterns (each request might have Salesforce URLs)
            requests = text.split(/(?=https:\/\/innowisegroup2\.my\.salesforce\.com)/).filter(Boolean);
        }

        console.log(`📑 Split text into ${requests.length} potential requests using pattern matching`);

        return requests.map(req => req.trim()).filter(req => req.length > 0);
    }

    /**
     * Basic heuristic to check if text looks like a Salesforce request.
     * @param text - Text to validate
     * @returns True if text appears to be a Salesforce request
     */
    private looksLikeSalesforceRequest(text: string): boolean {
        const indicators = [
            /CV\s*-.*?-/i, // CV - pattern
            /\d+\.\s*Индустрия\s*проекта/i, // Field 1 pattern
            /\d+\.\s*Подробные\s*требования\s*к\s*разработчику/i, // Field 14 pattern
            /salesforce\.com/i, // Salesforce URL
            /Сейлс\s*менеджер/i, // Sales manager field
            /Координатор/i // Coordinator field
        ];

        const matches = indicators.filter(pattern => pattern.test(text)).length;
        return matches >= 2; // Must match at least 2 indicators
    }

    // ═══════════════════════════════════════════════════════════════════════════════════
    // DEBUG & UTILITY METHODS
    // ═══════════════════════════════════════════════════════════════════════════════════

    /**
     * Saves extracted requests to separate text files for debugging.
     * @param requests - Array of extracted requests
     * @param outputDir - Directory to save individual request files
     */
    async saveRequestsForDebug(requests: string[], outputDir = './debug-requests'): Promise<void> {
        try {
            await fs.mkdir(outputDir, { recursive: true });

            for (let i = 0; i < requests.length; i++) {
                const filename = `${outputDir}/request-${String(i + 1).padStart(3, '0')}.txt`;
                await fs.writeFile(filename, requests[i]);
            }

            console.log(`🐛 Saved ${requests.length} requests to ${outputDir}/ for debugging`);
        } catch (error) {
            console.error('❌ Error saving debug files:', error);
        }
    }

    /**
     * Analyzes document structure to help improve splitting logic.
     * @param filePath - Path to Word document
     * @returns Structure analysis report
     */
    async analyzeDocumentStructure(filePath: string): Promise<void> {
        try {
            const result = await mammoth.extractRawText({ path: filePath });
            const text = result.value;

            console.log('📋 Document Structure Analysis:');
            console.log(`Total length: ${text.length} characters`);
            console.log(`Line breaks: ${(text.match(/\n/g) || []).length}`);
            console.log(`Form feeds: ${(text.match(/\f/g) || []).length}`);
            console.log(`CV patterns: ${(text.match(/CV\s*-/gi) || []).length}`);
            console.log(`Salesforce URLs: ${(text.match(/salesforce\.com/gi) || []).length}`);
            console.log(`Field 1 patterns: ${(text.match(/1\.\s*Индустрия/gi) || []).length}`);

            // Show first few characters to understand structure
            console.log('\n📖 First 500 characters:');
            console.log(text.substring(0, 500));

        } catch (error) {
            console.error('❌ Error analyzing document:', error);
        }
    }
}
