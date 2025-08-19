// scripts/better-split.ts
import mammoth from 'mammoth';
import { writeFile } from 'fs/promises';

(async () => {
    console.log('📄 Reading Word document...');
    const { value } = await mammoth.extractRawText({ path: '../data/salesforce-requests.docx' });

    // ✅ Ищем границы реальных вакансий
    let pages: string[] = [];

    // Стратегия: полные заголовки вакансий (не просто QA, а целые роли)
    const jobTitlePatterns = [
        // Английские полные заголовки
        /(?=^[\w\s–\-()]+(?:QA|Quality Assurance)[\w\s–\-()]*(?:Engineer|Automation|Analyst|Tester|Specialist)[\w\s–\-()]*$)/m,
        // Русские структурированные блоки
        /(?=^\d+\.\s*Индустрия\s*проекта)/m,
        // CV блоки (мусор, но тоже отдельные записи)
        /(?=^CV\s*-\s*[\w\s-]+\s*-)/m
    ];

    // Пытаемся разделить последовательно
    for (const pattern of jobTitlePatterns) {
        const splits = value.split(pattern);
        if (splits.length > pages.length) {
            pages = splits;
            console.log(`📋 Pattern found ${splits.length} sections`);
        }
    }

    // Если не получилось - используем комбинированный подход
    if (pages.length < 3) {
        pages = value.split(/(?=(?:Senior|Mid[- ]?Level|Junior)?\s*QA[\s\w]*(?:Engineer|Automation|Analyst)(?:\s*[–\-]\s*[\w\s().]+)?(?:\s*\([\w\s]+\))?$)/m);
    }

    console.log(`📊 Found ${pages.length} potential job postings`);

    const log: string[] = ['#\ttitle\ttype\tlength\thas_requirements'];

    pages.forEach((page, i) => {
        const trimmed = page.trim();
        if (!trimmed || trimmed.length < 50) return; // Пропускаем слишком короткие

        const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean);
        const title = lines[0] || '';

        // Определяем тип по контенту
        const hasStructured = /^\d+\.\s*(?:Индустрия|Подробные требования)/m.test(page);
        const hasEnglishSections = /(Responsibilities|Requirements|Tech Stack|Project Context):/i.test(page);
        const hasRussianFields = /(Сейлс менеджер|Координатор|Уровень разработчиков)/i.test(page);
        const isCV = /^CV\s*-/.test(title);
        const hasRequirements = /(Requirements|Требования|Experience|years|опыт)/i.test(page);

        let type = 'unknown';
        if (isCV) type = 'cv-link';
        else if (hasStructured && hasRussianFields) type = 'ru-structured';
        else if (hasEnglishSections && hasRussianFields) type = 'mixed';
        else if (hasEnglishSections) type = 'en-job';
        else if (hasStructured) type = 'ru-partial';

        // Только значимые записи
        if ((type === 'en-job' || type === 'mixed' || type === 'ru-structured') && trimmed.length > 200) {
            log.push([
                i + 1,
                title.slice(0, 80).replace(/\t/g, ' '),
                type,
                trimmed.length,
                hasRequirements ? 'yes' : 'no'
            ].join('\t'));
        }
    });

    await writeFile('job-pages.tsv', log.join('\n'));
    console.log(`✅ Analysis completed: ${log.length - 1} real job postings → job-pages.tsv`);

    // Показать превью
    console.log('\n📋 Real job postings preview:');
    log.slice(0, 10).forEach(line => console.log(line));
})();
