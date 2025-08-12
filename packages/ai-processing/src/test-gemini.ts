import { AnalysisService } from './services/analysis.service.js';
import { DatabaseEmployeeAdapter } from './adapters/database.adapter.js';
import { logger } from '@repo/logger/src';

async function testAnalysisService() {
    try {
        logger.info('🔥 Starting modular analysis test...');

        // Получаем данные
        const dataAdapter = new DatabaseEmployeeAdapter();
        const employees = await dataAdapter.getAllEmployees();

        console.log(`📋 Найдено сотрудников: ${employees.length}`);

        // Создаем сервис анализа
        const analysisService = new AnalysisService();

        console.log('\n🔥 Запускаем анализ команды...\n');

        // Анализируем команду
        const result = await analysisService.analyzeTeam(employees);

        console.log('📊 РЕЗУЛЬТАТ АНАЛИЗА КОМАНДЫ:');
        console.log('================================');
        console.log(result.analysis);
        console.log('================================');

        console.log('\n📈 СТАТИСТИКА:');
        console.log(`• Время выполнения: ${result.duration}ms`);
        console.log(`• Токенов использовано: ${result.tokensUsed || 'N/A'}`);
        console.log(`• Длина анализа: ${result.analysis.length} символов`);

        logger.info('✅ Modular analysis test completed');

    } catch (error) {
        logger.error('💥 Analysis test failed:', error);
        console.error('Ошибка:', error instanceof Error ? error.message : error);
    }
}

testAnalysisService().then(() => logger.info(`End`));
