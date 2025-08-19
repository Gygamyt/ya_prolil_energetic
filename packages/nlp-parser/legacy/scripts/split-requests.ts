// scripts/split-requests.ts
import mammoth from 'mammoth';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

async function splitSalesforceRequests() {
    console.log('📄 Reading Word document...');

    const inputFile = path.resolve('../data/salesforce-requests.docx');
    const outputDir = path.resolve('./jobs');

    const { value: raw } = await mammoth.extractRawText({ path: inputFile });

    // ✅ Более точный паттерн - ищем CV с номером R-xxxxx (первая строка блока)
    const cvPattern = /(?=^CV - [^R\n]*R-\d+)/gm;

    const parts = raw
        .split(cvPattern)
        .map(part => part.trim())
        .filter(part => part.length > 50);

    console.log(`🎯 Found ${parts.length} job requests`);

    await mkdir(outputDir, { recursive: true });

    for (let i = 0; i < parts.length; i++) {
        const filename = path.join(outputDir, `job-${String(i + 1).padStart(3, '0')}.txt`);
        await writeFile(filename, parts[i], 'utf-8');

        const firstLine = parts[i].split('\n')[0] || 'empty';
        console.log(`📝 Job ${i + 1}: ${firstLine.slice(0, 80)}... (${parts[i].length} chars)`);
    }

    console.log(`✅ Saved ${parts.length} isolated job requests to ${outputDir}/`);
}

splitSalesforceRequests().catch(console.error);
