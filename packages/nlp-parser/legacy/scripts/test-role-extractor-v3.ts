import fs from 'fs';
import path from 'path';
import { RoleExtractorV3, RoleType } from '../extractors/role-extractor-v3';

interface TestCase {
    id: string;
    content: string;
    expectedType?: RoleType;
    expectedRole?: string;
}

class RoleExtractorTesterV3 {
    private extractor = new RoleExtractorV3();
    private testCases: TestCase[] = [];

    constructor() {
        this.loadTestCases();
    }

    loadTestCases() {
        console.log('📁 Loading test cases from jobs directory...');

        const jobsDir = './jobs';

        if (!fs.existsSync(jobsDir)) {
            console.log(`❌ Directory ${jobsDir} not found!`);
            return;
        }

        const txtFiles = fs.readdirSync(jobsDir)
            .filter(f => f.endsWith('.txt'))
            .sort()
            .slice(0, 20); // Берем первые 20 файлов

        console.log(`📄 Found ${txtFiles.length} files to test`);

        this.testCases = txtFiles.map((filename) => {
            const filePath = path.join(jobsDir, filename);
            const content = fs.readFileSync(filePath, 'utf8');

            const { expectedType, expectedRole } = this.guessExpected(filename, content);

            return {
                id: filename.replace('.txt', ''),
                content,
                expectedType,
                expectedRole
            };
        });

        console.log(`✅ Loaded ${this.testCases.length} test cases\n`);
    }

    /**
     * Угадываем ожидаемый тип и роль из содержимого
     */
    private guessExpected(filename: string, content: string): {
        expectedType?: RoleType;
        expectedRole?: string;
    } {
        const name = filename.toLowerCase();
        const text = content.toLowerCase();

        // Automation roles
        if (text.includes('mobile app test automation') || text.includes('mobile.*automation.*engineer')) {
            return { expectedType: RoleType.QA_MOBILE, expectedRole: 'Mobile App Test Automation Engineer' };
        }
        if (text.includes('test automation engineer')) {
            return { expectedType: RoleType.QA_AUTOMATION, expectedRole: 'Test Automation Engineer' };
        }
        if (text.includes('qa automation engineer') || text.includes('automation qa')) {
            return { expectedType: RoleType.QA_AUTOMATION, expectedRole: 'QA Automation Engineer' };
        }

        // Manual roles
        if (text.includes('manual qa') || text.includes('qa manual')) {
            return { expectedType: RoleType.QA_MANUAL, expectedRole: 'Manual QA Engineer' };
        }

        // Lead roles
        if (text.includes('lead qa') || text.includes('qa lead')) {
            return { expectedType: RoleType.QA_LEAD, expectedRole: 'Lead QA Engineer' };
        }

        // Senior roles
        if (text.includes('senior qa')) {
            if (text.includes('automation')) {
                return { expectedType: RoleType.QA_SENIOR, expectedRole: 'Senior QA Automation Engineer' };
            }
            return { expectedType: RoleType.QA_SENIOR, expectedRole: 'Senior QA Engineer' };
        }

        // Fullstack
        if (text.includes('fullstack qa') || text.includes('qa.*fullstack')) {
            return { expectedType: RoleType.QA_FULLSTACK, expectedRole: 'Fullstack QA Engineer' };
        }

        // SDET
        if (text.includes('sdet')) {
            return { expectedType: RoleType.SDET, expectedRole: 'SDET' };
        }

        // Mobile
        if (text.includes('mobile qa') || text.includes('mobile.*tester')) {
            return { expectedType: RoleType.QA_MOBILE, expectedRole: 'Mobile QA Tester' };
        }

        // General QA
        if (text.includes('qa engineer') || text.includes('quality assurance')) {
            return { expectedType: RoleType.QA_GENERAL, expectedRole: 'QA Engineer' };
        }

        // Test Engineer
        if (text.includes('test engineer')) {
            return { expectedType: RoleType.TEST_ENGINEER, expectedRole: 'Test Engineer' };
        }

        return {};
    }

    /**
     * Запуск основного теста
     */
    runMainTest() {
        console.log('🧪 RUNNING MAIN TEST - All Role Types');
        console.log('='.repeat(60));

        const results = [];
        let successCount = 0;

        for (const testCase of this.testCases) {
            console.log(`\n📝 Testing: ${testCase.id}`);
            console.log(`Expected: ${testCase.expectedRole || 'unknown'} (${testCase.expectedType || 'unknown'})`);

            // Запускаем экстрактор с дебагом для первых 3 случаев
            const debug = results.length < 3;
            const result = this.extractor.extractRole(testCase.content, { debug });

            if (result) {
                console.log(`✅ Found: ${result.role} (${result.roleType}, conf: ${result.confidence})`);
                console.log(`   Source: ${result.source}`);

                // Проверяем соответствие
                const matches = this.checkMatch(testCase, result);
                if (matches) successCount++;

                results.push({ testCase, result, success: matches });
            } else {
                console.log(`❌ Not found`);
                results.push({ testCase, result: null, success: false });
            }

            // Показываем превью
            const preview = testCase.content.replace(/\n/g, ' ').substring(0, 150);
            console.log(`📄 Preview: ${preview}...`);
            console.log('-'.repeat(50));
        }

        this.printSummary('MAIN TEST', results, successCount);
        return results;
    }

    /**
     * Тест с фильтрацией по типам ролей
     */
    runFilteredTests() {
        console.log('\n🎯 RUNNING FILTERED TESTS');
        console.log('='.repeat(60));

        const testConfigs = [
            {
                name: 'Automation Only',
                config: { expectedRoleTypes: [RoleType.QA_AUTOMATION, RoleType.SDET] }
            },
            {
                name: 'Manual Only',
                config: { expectedRoleTypes: [RoleType.QA_MANUAL] }
            },
            {
                name: 'Senior + Lead',
                config: { expectedRoleTypes: [RoleType.QA_SENIOR, RoleType.QA_LEAD] }
            }
        ];

        for (const { name, config } of testConfigs) {
            console.log(`\n🔍 Testing: ${name}`);
            console.log(`Looking for: ${config.expectedRoleTypes.join(', ')}`);

            let found = 0;
            for (const testCase of this.testCases.slice(0, 5)) { // Берем первые 5 для быстроты
                const result = this.extractor.extractRole(testCase.content, config);
                if (result) {
                    console.log(`  ✅ ${testCase.id}: ${result.role}`);
                    found++;
                } else {
                    console.log(`  ❌ ${testCase.id}: not found`);
                }
            }

            console.log(`  📊 Found: ${found}/5`);
        }
    }

    /**
     * Проверяем соответствие результата ожиданиям
     */
    private checkMatch(testCase: TestCase, result: any): boolean {
        if (!testCase.expectedType) return true; // Нечего проверять

        // Проверяем тип
        const typeMatches = result.roleType === testCase.expectedType;

        // Проверяем роль (упрощенно)
        const roleMatches = !testCase.expectedRole ||
            result.role.toLowerCase().includes(testCase.expectedRole.toLowerCase().split(' ')[0]);

        const matches = typeMatches && roleMatches;

        if (!matches) {
            console.log(`  ⚠️  Mismatch: expected type ${testCase.expectedType}, got ${result.roleType}`);
        } else {
            console.log(`  ✅ Match!`);
        }

        return matches;
    }

    /**
     * Печатаем сводку результатов
     */
    private printSummary(testName: string, results: any[], successCount: number) {
        const total = results.length;
        const percentage = Math.round((successCount / total) * 100);

        console.log(`\n📊 ${testName} SUMMARY:`);
        console.log(`Success: ${successCount}/${total} (${percentage}%)`);

        // Показываем успешные случаи
        const successful = results.filter(r => r.success && r.result);
        if (successful.length > 0) {
            console.log(`\n✅ SUCCESSFUL (${successful.length}):`);
            successful.forEach(s => {
                console.log(`  ${s.testCase.id}: ${s.result.role} (${s.result.roleType})`);
            });
        }

        // Показываем неудачные случаи
        const failed = results.filter(r => !r.success);
        if (failed.length > 0) {
            console.log(`\n❌ FAILED (${failed.length}):`);
            failed.forEach(f => {
                const expected = f.testCase.expectedRole || 'unknown';
                const got = f.result?.role || 'NOT FOUND';
                console.log(`  ${f.testCase.id}: expected "${expected}", got "${got}"`);
            });
        }
    }

    /**
     * Тест утилитарных методов
     */
    runUtilityTests() {
        console.log('\n🔧 TESTING UTILITY METHODS');
        console.log('='.repeat(40));

        // Тест getPossibleRolesForType
        console.log('📋 Possible roles for QA_AUTOMATION:');
        const automationRoles = this.extractor.getPossibleRolesForType(RoleType.QA_AUTOMATION);
        automationRoles.forEach(role => console.log(`  - ${role}`));

        // Тест getRoleTypeByName
        const testNames = ['QA Engineer', 'SDET', 'Manual QA Engineer'];
        console.log('\n🔍 Getting role types by name:');
        testNames.forEach(name => {
            const type = this.extractor.getRoleTypeByName(name);
            console.log(`  "${name}" → ${type}`);
        });
    }

    /**
     * Запуск всех тестов
     */
    runAllTests() {
        const mainResults = this.runMainTest();
        this.runFilteredTests();
        this.runUtilityTests();

        return mainResults;
    }
}

// Запуск тестов
console.log('🚀 Starting Role Extractor V3 Tests');
console.log('📂 Working with files from packages/nlp-parser/src/scripts/jobs\n');

const tester = new RoleExtractorTesterV3();
tester.runAllTests();
