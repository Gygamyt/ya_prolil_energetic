import { describe, it, expect, beforeEach } from 'vitest'
import { SharedNlpManager } from '../../../src/shared/nlp-manager'

describe('SharedNlpManager', () => {
    let nlpManager: SharedNlpManager

    beforeEach(() => {
        nlpManager = new SharedNlpManager()
    })

    describe('initialization', () => {
        it('should initialize successfully', () => {
            expect(nlpManager).toBeDefined()
            expect(nlpManager.isTrained()).toBe(false)
        })

        it('should train successfully', async () => {
            await nlpManager.train()
            expect(nlpManager.isTrained()).toBe(true)
        })
    })

    describe('role extraction', () => {
        it('should extract QA roles from text', async () => {
            const text = "We are looking for a Senior QA Engineer with experience in test automation."
            const roles = await nlpManager.extractRoles(text)

            expect(roles).toContain('Senior QA Engineer')
        })

        it('should extract multiple roles', async () => {
            const text = "Need QA Engineer and Test Automation Engineer for our team."
            const roles = await nlpManager.extractRoles(text)

            expect(roles).toHaveLength(2)
            expect(roles).toContain('QA Engineer')
            expect(roles).toContain('Test Automation Engineer')
        })

        it('should handle Russian text', async () => {
            const text = "Ищем QA инженера и автоматизатора тестирования"
            const roles = await nlpManager.extractRoles(text, 'ru')

            expect(roles.length).toBeGreaterThan(0)
        })
    })

    describe('level extraction', () => {
        it('should extract experience levels', async () => {
            const text = "Senior developer with Middle+ experience"
            const levels = await nlpManager.extractLevels(text)

            expect(levels).toContain('Senior')
        })
    })

    describe('comprehensive extraction', () => {
        it('should extract all entity types', async () => {
            const text = `
        We need a Senior QA Automation Engineer with JavaScript and Selenium experience.
        Contact Andrei Robilka for more details.
      `

            const entities = await nlpManager.extractAllEntities(text)

            expect(entities.roles.length).toBeGreaterThan(0)
            expect(entities.levels.length).toBeGreaterThan(0)
            expect(entities.persons.length).toBeGreaterThan(0)
            expect(entities.technologies.length).toBeGreaterThan(0)
        })
    })

    describe('performance', () => {
        it('should process text efficiently', async () => {
            const text = "QA Engineer position available"

            const startTime = Date.now()
            await nlpManager.extractRoles(text)
            const endTime = Date.now()

            expect(endTime - startTime).toBeLessThan(1000) // Должно быть быстрее 1 секунды
        })

        it('should cache training results', async () => {
            await nlpManager.train()
            const firstTrainTime = Date.now()

            await nlpManager.train() // Второй вызов должен быть мгновенным
            const secondTrainTime = Date.now()

            expect(secondTrainTime - firstTrainTime).toBeLessThan(10)
        })
    })
})
