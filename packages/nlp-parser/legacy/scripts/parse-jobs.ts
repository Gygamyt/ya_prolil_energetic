import { readdir, readFile } from 'fs/promises';
import path from 'path';
import { NLPBatchProcessor } from '../services/batch.processor';
import { RoleExtractor } from '../extractors';

(async () => {
    console.log('📁 Reading job files…');
    const dir   = path.resolve('./jobs');
    const files = (await readdir(dir)).filter(f => f.endsWith('.txt'));

    const texts = await Promise.all(
        files.map(f => readFile(path.join(dir, f), 'utf8'))
    );
    console.log(`📋 Found ${files.length} job files`);

    const processor = new NLPBatchProcessor();
    const results   = await processor.parseBatchWithOptions(
        texts,
        {},    // текст уже нормализован
        5      // параллельно по 5
    );

    console.log('💾 Exporting results…');
    await processor.exportAll(results);

    const ok = results.filter(r => r.success).length;
    console.log(`✅ Successfully parsed: ${ok}/${results.length}`);

    /* ─── Новое: сохраняем статистику ролей ─── */
    const stats = RoleExtractor.getStats();
    console.log('📊 Role statistics:', stats);
    RoleExtractor.saveStats();        // ./role-stats.json
})();
