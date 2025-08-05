// test.ts
import { LogMethod } from './logging-decorator';
import { LoggerFactory } from './logger-factory';

// Инициализируем LoggerFactory, чтобы декоратор мог работать
LoggerFactory.getInstance().createLogger({
    level: 'info',
    environment: 'development',
    service: 'TestService'
});

class TestService {
    @LogMethod({level: "debug", logArgs: true })
    public async testMethod(name: string) {
        console.log(`Hello, ${name}!`);
        console.log(`Hello, ${name}!`);
        return `Processed: ${name}`;
    }
}

async function runTest() {
    const service = new TestService();
    await service.testMethod('World');
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

runTest();