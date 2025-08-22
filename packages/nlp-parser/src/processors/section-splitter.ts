/**
 * Section splitter: divides text into logical parts for parsing
 */
export interface SplitResult {
    metaInfo: string;
    description: string;
    numberedList: Record<number, string>;
    rawSections: string[];
}

export class SectionSplitter {
    /**
     * Split Salesforce request into structured sections
     */
    static split(text: string): SplitResult {
        const lines = text.split('\n').filter(line => line.trim().length > 0);

        const result: SplitResult = {
            metaInfo: '',
            description: '',
            numberedList: {},
            rawSections: lines
        };

        let currentSection: 'meta' | 'description' | 'list' = 'meta';
        let descriptionLines: string[] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            if (currentSection === 'meta') {
                let metaLines: string[] = [];
                for (let i = 0; i < Math.min(4, lines.length); i++) {
                    const line = lines[i].trim();
                    if (line.startsWith('CV -') || line.includes('salesforce.com') || line.includes('https://')) {
                        metaLines.push(line);
                    } else {
                        break;
                    }
                }

                result.metaInfo = metaLines.join('\n');

                if (line.toLowerCase().includes('описание')) {
                    currentSection = 'description';
                    continue;
                }

                if (/^\d+\.\s/.test(line)) {
                    currentSection = 'list';
                }
            }

            if (currentSection === 'description') {
                if (/^\d+\.\s/.test(line)) {
                    currentSection = 'list';
                } else {
                    descriptionLines.push(line);
                    continue;
                }
            }

            if (currentSection === 'list') {
                const match = line.match(/^(\d+)\.\s*(.*)$/);
                if (match) {
                    const number = parseInt(match[1]);
                    let fullContent = match[2].trim();
                    let j = i + 1;
                    while (j < lines.length && !/^\d+\.\s/.test(lines[j].trim())) {
                        const nextLine = lines[j].trim();
                        if (nextLine) {
                            fullContent += ' ' + nextLine;
                        }
                        j++;
                    }

                    result.numberedList[number] = fullContent;
                    i = j - 1;
                }
            }
        }

        result.description = descriptionLines.join(' ').trim();
        return result;
    }

    /**
     * Get missing numbered items (should be N/A)
     */
    static getMissingItems(numberedList: Record<number, string>): number[] {
        const existing = Object.keys(numberedList).map(Number).sort((a, b) => a - b);
        const missing: number[] = [];

        if (existing.length === 0) return missing;

        const max = Math.max(...existing);
        for (let i = 1; i <= max; i++) {
            if (!numberedList[i]) {
                missing.push(i);
            }
        }

        return missing;
    }

    /**
     * Fill missing items with N/A
     */
    static fillMissingItems(numberedList: Record<number, string>): Record<number, string> {
        const result = { ...numberedList };
        const missing = this.getMissingItems(numberedList);

        missing.forEach(num => {
            result[num] = 'N/A';
        });

        return result;
    }
}
