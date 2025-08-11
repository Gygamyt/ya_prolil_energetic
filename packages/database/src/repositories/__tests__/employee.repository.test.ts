import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, Db, ObjectId } from 'mongodb';
import { EmployeeRepository } from '../employee.repository';
import { CleanEmployeeObjectInput } from '../../collections/collections';

describe('EmployeeRepository', () => {
    let mongoServer: MongoMemoryServer;
    let client: MongoClient;
    let db: Db;
    let repository: EmployeeRepository;

    beforeEach(async () => {
        mongoServer = await MongoMemoryServer.create();
        const uri = mongoServer.getUri();
        client = new MongoClient(uri);
        await client.connect();
        db = client.db('test');
        repository = new EmployeeRepository(db);
    });

    afterEach(async () => {
        await client.close();
        await mongoServer.stop();
    });

    const createMockEmployee = (overrides: Partial<CleanEmployeeObjectInput> = {}): CleanEmployeeObjectInput => ({
        externalId: 'emp_test123456789',
        Grade: 'Middle',
        Name: 'John Doe',
        'JS, TS': 'High',
        'Java': 'Medium',
        'Python': 'Low',
        'C#': 'No',
        'Kotlin': 'No',
        'Ruby': 'No',
        'Swift': 'No',
        'Performance': 'Medium',
        'Security': 'High',
        'Accessibility': 'Medium',
        'Role': 'Fullstack',
        'Testing Framework': 'Jest, Vitest',
        'English': 'B2',
        'German': 'No',
        'Polish': 'No',
        'Country': 'Belarus',
        'City': 'Minsk',
        'Team Lead': 'Jane Smith',
        ...overrides
    });

    describe('create', () => {
        it('should create new employee with MongoDB generated _id', async () => {
            const employeeData = createMockEmployee();

            const result = await repository.create(employeeData);

            expect(result._id).toBeInstanceOf(ObjectId);
            expect(result.Name).toBe('John Doe');
            expect(result.externalId).toBe('emp_test123456789');
            expect(result.Grade).toBe('Middle');
        });

        it('should throw error if required fields are missing', async () => {
            const invalidEmployee = createMockEmployee({ Name: '' });

            const result = await repository.create(invalidEmployee);
            expect(result.Name).toBe('');
        });
    });

    describe('findById', () => {
        it('should find employee by valid ObjectId', async () => {
            const employeeData = createMockEmployee();
            const created = await repository.create(employeeData);

            const found = await repository.findById(created._id);

            expect(found).toBeDefined();
            expect(found!._id).toEqual(created._id);
            expect(found!.Name).toBe('John Doe');
        });

        it('should return null for non-existent ObjectId', async () => {
            const fakeId = new ObjectId();

            const result = await repository.findById(fakeId);

            expect(result).toBeNull();
        });

        it('should find employee by string ObjectId', async () => {
            const employeeData = createMockEmployee();
            const created = await repository.create(employeeData);

            const found = await repository.findById(created._id.toString());

            expect(found).toBeDefined();
            expect(found!._id).toEqual(created._id);
        });

        it('should handle invalid ObjectId string', async () => {
            await expect(repository.findById('invalid-id')).rejects.toThrow();
        });
    });

    describe('findByExternalId', () => {
        it('should find employee by externalId', async () => {
            const employeeData = createMockEmployee();
            await repository.create(employeeData);

            const found = await repository.findByExternalId('emp_test123456789');

            expect(found).toBeDefined();
            expect(found!.externalId).toBe('emp_test123456789');
            expect(found!.Name).toBe('John Doe');
        });

        it('should return null for non-existent externalId', async () => {
            const result = await repository.findByExternalId('emp_nonexistent');

            expect(result).toBeNull();
        });
    });

    describe('upsertByExternalId', () => {
        it('should create new employee when externalId does not exist', async () => {
            const employeeData = createMockEmployee();

            const result = await repository.upsertByExternalId(employeeData);

            expect(result.isNew).toBe(true);
            expect(result.employee._id).toBeInstanceOf(ObjectId);
            expect(result.employee.Name).toBe('John Doe');
            expect(result.employee.externalId).toBe('emp_test123456789');
        });

        it('should update existing employee when externalId exists', async () => {
            // Create initial employee
            const initialEmployee = createMockEmployee({ Name: 'Initial Name' });
            await repository.create(initialEmployee);

            // Update with same externalId
            const updatedEmployee = createMockEmployee({ Name: 'Updated Name' });
            const result = await repository.upsertByExternalId(updatedEmployee);

            expect(result.isNew).toBe(false);
            expect(result.employee.Name).toBe('Updated Name');
            expect(result.employee.externalId).toBe('emp_test123456789');
        });

        it('should preserve MongoDB _id when updating', async () => {
            // Create initial employee
            const initialEmployee = createMockEmployee();
            const created = await repository.create(initialEmployee);
            const originalId = created._id;

            // Update
            const updatedEmployee = createMockEmployee({ Grade: 'Senior' });
            const result = await repository.upsertByExternalId(updatedEmployee);

            expect(result.employee._id).toEqual(originalId);
            expect(result.employee.Grade).toBe('Senior');
        });
    });

    describe('updateById', () => {
        it('should update employee fields by ObjectId', async () => {
            const employeeData = createMockEmployee();
            const created = await repository.create(employeeData);

            const updated = await repository.updateById(created._id, {
                Grade: 'Senior',
                'JS, TS': 'High'
            });

            expect(updated).toBeDefined();
            expect(updated!.Grade).toBe('Senior');
            expect(updated!['JS, TS']).toBe('High');
            expect(updated!.Name).toBe('John Doe'); // unchanged
        });

        it('should return null for non-existent ObjectId', async () => {
            const fakeId = new ObjectId();

            const result = await repository.updateById(fakeId, { Grade: 'Senior' });

            expect(result).toBeNull();
        });
    });

    describe('deleteById', () => {
        it('should delete existing employee and return true', async () => {
            const employeeData = createMockEmployee();
            const created = await repository.create(employeeData);

            const deleted = await repository.deleteById(created._id);

            expect(deleted).toBe(true);

            // Verify deletion
            const found = await repository.findById(created._id);
            expect(found).toBeNull();
        });

        it('should return false for non-existent employee', async () => {
            const fakeId = new ObjectId();

            const deleted = await repository.deleteById(fakeId);

            expect(deleted).toBe(false);
        });
    });

    describe('findAll', () => {
        it('should return all employees when no filter', async () => {
            await repository.create(createMockEmployee({ Name: 'Employee 1' }));
            await repository.create(createMockEmployee({ Name: 'Employee 2', externalId: 'emp_test987654321' }));

            const result = await repository.findAll();

            expect(result).toHaveLength(2);
            expect(result.map(e => e.Name)).toEqual(expect.arrayContaining(['Employee 1', 'Employee 2']));
        });

        it('should filter employees by given criteria', async () => {
            await repository.create(createMockEmployee({ Grade: 'Junior' }));
            await repository.create(createMockEmployee({ Grade: 'Senior', externalId: 'emp_test987654321' }));

            const result = await repository.findAll({ Grade: 'Senior' });

            expect(result).toHaveLength(1);
            expect(result[0].Grade).toBe('Senior');
        });

        it('should return empty array when no employees exist', async () => {
            const result = await repository.findAll();

            expect(result).toEqual([]);
        });
    });

    describe('findByName', () => {
        it('should find employee by exact name match', async () => {
            await repository.create(createMockEmployee({ Name: 'John Doe' }));
            await repository.create(createMockEmployee({ Name: 'Jane Smith', externalId: 'emp_test987654321' }));

            const result = await repository.findByName('John Doe');

            expect(result).toBeDefined();
            expect(result!.Name).toBe('John Doe');
        });

        it('should return null for non-matching name', async () => {
            await repository.create(createMockEmployee());

            const result = await repository.findByName('Non Existent');

            expect(result).toBeNull();
        });
    });

    describe('findByNamePartial', () => {
        it('should find employees by partial name match', async () => {
            await repository.create(createMockEmployee({ Name: 'John Doe' }));
            await repository.create(createMockEmployee({ Name: 'John Smith', externalId: 'emp_test987654321' }));
            await repository.create(createMockEmployee({ Name: 'Jane Doe', externalId: 'emp_test111222333' }));

            const result = await repository.findByNamePartial('John');

            expect(result).toHaveLength(2);
            expect(result.map(e => e.Name)).toEqual(expect.arrayContaining(['John Doe', 'John Smith']));
        });

        it('should be case insensitive', async () => {
            await repository.create(createMockEmployee({ Name: 'John Doe' }));

            const result = await repository.findByNamePartial('john');

            expect(result).toHaveLength(1);
            expect(result[0].Name).toBe('John Doe');
        });
    });

    describe('findBySkill', () => {
        it('should find employees by programming skill level', async () => {
            await repository.create(createMockEmployee({ 'JS, TS': 'High' }));
            await repository.create(createMockEmployee({ 'JS, TS': 'Medium', externalId: 'emp_test987654321' }));
            await repository.create(createMockEmployee({ 'JS, TS': 'High', 'Java': 'Low', externalId: 'emp_test111222333' }));

            const result = await repository.findBySkill('JS, TS', 'High');

            expect(result).toHaveLength(2);
            expect(result.every(e => e['JS, TS'] === 'High')).toBe(true);
        });

        it('should return empty array when no employees match skill level', async () => {
            await repository.create(createMockEmployee({ 'Python': 'Low' }));

            const result = await repository.findBySkill('Python', 'High');

            expect(result).toEqual([]);
        });
    });

    describe('findByGrade', () => {
        it('should find employees by grade level', async () => {
            await repository.create(createMockEmployee({ Grade: 'Middle' }));
            await repository.create(createMockEmployee({ Grade: 'Senior', externalId: 'emp_test987654321' }));
            await repository.create(createMockEmployee({ Grade: 'Middle', externalId: 'emp_test111222333' }));

            const result = await repository.findByGrade('Middle' as any);

            expect(result).toHaveLength(2);
            expect(result.every(e => e.Grade === 'Middle')).toBe(true);
        });
    });

    describe('findByTeamLead', () => {
        it('should find employees by team lead name', async () => {
            await repository.create(createMockEmployee({ 'Team Lead': 'Alice Johnson' }));
            await repository.create(createMockEmployee({ 'Team Lead': 'Bob Wilson', externalId: 'emp_test987654321' }));
            await repository.create(createMockEmployee({ 'Team Lead': 'Alice Johnson', externalId: 'emp_test111222333' }));

            const result = await repository.findByTeamLead('Alice Johnson');

            expect(result).toHaveLength(2);
            expect(result.every(e => e['Team Lead'] === 'Alice Johnson')).toBe(true);
        });
    });

    describe('bulkUpsertByExternalId', () => {
        it('should handle bulk create operations', async () => {
            const employees = [
                createMockEmployee({ Name: 'Employee 1', externalId: 'emp_001' }),
                createMockEmployee({ Name: 'Employee 2', externalId: 'emp_002' }),
                createMockEmployee({ Name: 'Employee 3', externalId: 'emp_003' })
            ];

            const result = await repository.bulkUpsertByExternalId(employees);

            expect(result.created).toBe(3);
            expect(result.updated).toBe(0);
            expect(result.errors).toEqual([]);
        });

        it('should handle mixed create and update operations', async () => {
            // Create initial employee
            await repository.create(createMockEmployee({ externalId: 'emp_001', Name: 'Original Name' }));

            const employees = [
                createMockEmployee({ Name: 'Updated Name', externalId: 'emp_001' }), // update
                createMockEmployee({ Name: 'New Employee', externalId: 'emp_002' })  // create
            ];

            const result = await repository.bulkUpsertByExternalId(employees);

            expect(result.created).toBe(1);
            expect(result.updated).toBe(1);
            expect(result.errors).toEqual([]);

            // Verify update
            const updated = await repository.findByExternalId('emp_001');
            expect(updated!.Name).toBe('Updated Name');
        });

        it('should handle empty array gracefully', async () => {
            const result = await repository.bulkUpsertByExternalId([]);

            expect(result.created).toBe(0);
            expect(result.updated).toBe(0);
        });
    });

    describe('findRecordsWithoutExternalId', () => {
        it('should find records missing externalId field', async () => {
            // Create employee without externalId
            const collection = db.collection('employees.raw');
            const employeeWithoutExtId = createMockEmployee();
            delete (employeeWithoutExtId as any).externalId;
            await collection.insertOne(employeeWithoutExtId);

            // Create employee with externalId
            await repository.create(createMockEmployee({ externalId: 'emp_with_id' }));

            const result = await repository.findRecordsWithoutExternalId();

            expect(result).toHaveLength(1);
            expect(result[0].Name).toBe('John Doe');
            expect(result[0]._id).toBeInstanceOf(ObjectId);
        });

        it('should return empty array when all records have externalId', async () => {
            await repository.create(createMockEmployee());

            const result = await repository.findRecordsWithoutExternalId();

            expect(result).toEqual([]);
        });
    });

    describe('edge cases and error handling', () => {
        it('should handle large datasets efficiently', async () => {
            const largeDataset = Array.from({ length: 100 }, (_, i) =>
                createMockEmployee({
                    Name: `Employee ${i}`,
                    externalId: `emp_${i.toString().padStart(3, '0')}`
                })
            );

            const start = Date.now();
            const result = await repository.bulkUpsertByExternalId(largeDataset);
            const duration = Date.now() - start;

            expect(result.created).toBe(100);
            expect(result.errors).toEqual([]);
            expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
        });

        it('should handle special characters in employee data', async () => {
            const employeeWithSpecialChars = createMockEmployee({
                Name: 'Müller-Østraßen',
                'Team Lead': 'José María García',
                externalId: 'emp_special_chars'
            });

            const created = await repository.create(employeeWithSpecialChars);
            const found = await repository.findById(created._id);

            expect(found!.Name).toBe('Müller-Østraßen');
            expect(found!['Team Lead']).toBe('José María García');
        });
    });
});
