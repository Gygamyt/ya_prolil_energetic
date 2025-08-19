import { describe, it, expect } from 'vitest'
import { promises as fs } from 'fs'
import path from 'path'
import { SharedNlpManager } from '../../../src/shared/nlp-manager'

interface JobAnalysis {
    file: string;
    content: string;
    extractedRoles: string[];
    extractedLevels: string[];
    extractedPersons: string[];
    extractedTechnologies: string[];
    totalEntities: number;
    processingTime: number;
}

describe('SharedNlpManager - Real Data Tests', () => {
    let nlpManager: SharedNlpManager
    const jobsDir = path.join(__dirname, 'jobs') // Папка jobs рядом с тестом

    beforeEach(() => {
        nlpManager = new SharedNlpManager()
    })

    describe('process real job files', () => {
        it('should process job files from directory', async () => {
            // Читаем все .txt файлы из папки jobs
            const files = await fs.readdir(jobsDir)
            const txtFiles = files.filter(f => f.endsWith('.txt')).slice(0, 10) // Первые 10 файлов

            console.log(`📁 Found ${txtFiles.length} job files to process`)

            const results: JobAnalysis[] = []

            for (const file of txtFiles) {
                const filePath = path.join(jobsDir, file)
                const content = await fs.readFile(filePath, 'utf-8')

                console.log(`\n🔍 Processing: ${file}`)

                const startTime = Date.now()
                const entities = await nlpManager.extractAllEntities(content)
                const processingTime = Date.now() - startTime

                const analysis: JobAnalysis = {
                    file,
                    content: content.substring(0, 200) + '...', // Первые 200 символов для лога
                    extractedRoles: entities.roles,
                    extractedLevels: entities.levels,
                    extractedPersons: entities.persons,
                    extractedTechnologies: entities.technologies,
                    totalEntities: entities.roles.length + entities.levels.length +
                        entities.persons.length + entities.technologies.length,
                    processingTime
                }

                results.push(analysis)

                console.log(`  💼 Roles: [${entities.roles.join(', ')}]`)
                console.log(`  📊 Levels: [${entities.levels.join(', ')}]`)
                console.log(`  👥 Persons: [${entities.persons.join(', ')}]`)
                console.log(`  🔧 Technologies: [${entities.technologies.join(', ')}]`)
                console.log(`  ⏱️ Processing time: ${processingTime}ms`)
            }

            // Статистика
            this.printStatistics(results)

            // Проверки
            expect(results.length).toBeGreaterThan(0)
            expect(results.some(r => r.extractedRoles.length > 0)).toBe(true)

            // Сохраняем результаты для анализа
            await this.saveResults(results)
        })

        it('should extract roles from specific job examples', async () => {
            const testCases = [
                {
                    text: "We are looking for a Senior QA Automation Engineer with 5+ years experience",
                    expectedRoles: ['Senior QA Automation Engineer'],
                    expectedLevels: ['Senior']
                },
                {
                    text: "Mobile App Test Automation Engineer position available. Contact John Smith.",
                    expectedRoles: ['Mobile App Test Automation Engineer'],
                    expectedPersons: ['John Smith']
                },
                {
                    text: "Lead QA Engineer needed for JavaScript and Selenium project",
                    expectedRoles: ['Lead QA Engineer'],
                    expectedTechnologies: ['JavaScript', 'Selenium']
                }
            ]

            for (const testCase of testCases) {
                console.log(`\n🧪 Testing: "${testCase.text}"`)

                const entities = await nlpManager.extractAllEntities(testCase.text)

                console.log(`  Found roles: [${entities.roles.join(', ')}]`)
                console.log(`  Found levels: [${entities.levels.join(', ')}]`)
                console.log(`  Found persons: [${entities.persons.join(', ')}]`)
                console.log(`  Found technologies: [${entities.technologies.join(', ')}]`)

                // Проверки
                if (testCase.expectedRoles) {
                    expect(entities.roles).toEqual(expect.arrayContaining(testCase.expectedRoles))
                }
                if (testCase.expectedLevels) {
                    expect(entities.levels).toEqual(expect.arrayContaining(testCase.expectedLevels))
                }
                if (testCase.expectedPersons) {
                    expect(entities.persons).toEqual(expect.arrayContaining(testCase.expectedPersons))
                }
                if (testCase.expectedTechnologies) {
                    expect(entities.technologies).toEqual(expect.arrayContaining(testCase.expectedTechnologies))
                }
            }
        })
    })

    // Утилитарные методы для статистики
 printStatistics(results: JobAnalysis[]) {
        console.log('\n📊 STATISTICS:')
        console.log('=' * 50)

        const totalFiles = results.length
        const filesWithRoles = results.filter(r => r.extractedRoles.length > 0).length
        const filesWithLevels = results.filter(r => r.extractedLevels.length > 0).length
        const filesWithPersons = results.filter(r => r.extractedPersons.length > 0).length
        const filesWithTech = results.filter(r => r.extractedTechnologies.length > 0).length

        const avgProcessingTime = results.reduce((sum, r) => sum + r.processingTime, 0) / totalFiles

        console.log(`📁 Total files processed: ${totalFiles}`)
        console.log(`💼 Files with roles: ${filesWithRoles}/${totalFiles} (${Math.round(filesWithRoles/totalFiles*100)}%)`)
        console.log(`📊 Files with levels: ${filesWithLevels}/${totalFiles} (${Math.round(filesWithLevels/totalFiles*100)}%)`)
        console.log(`👥 Files with persons: ${filesWithPersons}/${totalFiles} (${Math.round(filesWithPersons/totalFiles*100)}%)`)
        console.log(`🔧 Files with technologies: ${filesWithTech}/${totalFiles} (${Math.round(filesWithTech/totalFiles*100)}%)`)
        console.log(`⏱️ Average processing time: ${Math.round(avgProcessingTime)}ms`)

        // Топ найденных ролей
        const allRoles = results.flatMap(r => r.extractedRoles)
        const roleFrequency = allRoles.reduce((acc, role) => {
            acc[role] = (acc[role] || 0) + 1
            return acc
        }, {} as Record<string, number>)

        const topRoles = Object.entries(roleFrequency)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)

        console.log('\n🏆 Top 5 extracted roles:')
        topRoles.forEach(([role, count], index) => {
            console.log(`  ${index + 1}. "${role}" - ${count} times`)
        })
    }

 async saveResults(results: JobAnalysis[]) {
        const outputPath = path.join(__dirname, 'nlp-analysis-results.json')
        await fs.writeFile(outputPath, JSON.stringify(results, null, 2), 'utf-8')
        console.log(`\n💾 Results saved to: ${outputPath}`)
    }
})
