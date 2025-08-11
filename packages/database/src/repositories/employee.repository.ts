import { Collection, Db, ObjectId } from 'mongodb';
import { CleanEmployeeObject, CleanEmployeeObjectInput } from "../collections/collections";
import { Grade } from "@repo/shared/src/schemas";

export class EmployeeRepository {
    private collection: Collection<CleanEmployeeObjectInput>;

    constructor(db: Db) {
        this.collection = db.collection<CleanEmployeeObjectInput>('employees.raw');
    }

    /**
     * Find employee by external ID
     */
    async findByExternalId(externalId: string): Promise<CleanEmployeeObject | null> {
        return await this.collection.findOne({ externalId }) as CleanEmployeeObject | null;
    }

    /**
     * Upsert by external ID - MongoDB manages _id automatically
     */
    async upsertByExternalId(employeeData: CleanEmployeeObjectInput): Promise<{
        employee: CleanEmployeeObject;
        isNew: boolean;
    }> {
        // Check if record exists
        const existing = await this.collection.findOne({ externalId: employeeData.externalId });
        const isNew = !existing;

        const result = await this.collection.findOneAndUpdate(
            { externalId: employeeData.externalId },
            { $set: employeeData },
            {
                upsert: true,
                returnDocument: 'after'
            }
        );

        if (!result) {
            throw new Error(`Failed to upsert employee with externalId: ${employeeData.externalId}`);
        }

        return {
            employee: result as CleanEmployeeObject, // MongoDB added _id
            isNew
        };
    }

    /**
     * Bulk upsert for mass operations (for synchronization)
     */
    async bulkUpsertByExternalId(employees: CleanEmployeeObjectInput[]): Promise<{
        created: number;
        updated: number;
        errors: Array<{ externalId: string; error: string }>;
    }> {
        const operations = employees.map(emp => ({
            updateOne: {
                filter: { externalId: emp.externalId },
                update: { $set: emp },
                upsert: true
            }
        }));

        try {
            const result = await this.collection.bulkWrite(operations);

            return {
                created: result.upsertedCount,
                updated: result.modifiedCount,
                errors: []
            };
        } catch (error) {
            return {
                created: 0,
                updated: 0,
                errors: [{
                    externalId: 'bulk_operation',
                    error: error instanceof Error ? error.message : 'Unknown error'
                }]
            };
        }
    }

    /**
     * Create new employee record - MongoDB automatically adds _id
     */
    async create(employee: CleanEmployeeObjectInput): Promise<CleanEmployeeObject> {
        const result = await this.collection.insertOne(employee);
        // MongoDB created _id, return full object
        return { ...employee, _id: result.insertedId } as CleanEmployeeObject;
    }

    /**
     * Update employee by MongoDB ObjectId
     */
    async updateById(id: string | ObjectId, update: Partial<CleanEmployeeObjectInput>): Promise<CleanEmployeeObject | null> {
        return await this.collection.findOneAndUpdate(
            { _id: new ObjectId(id) },
            { $set: update },
            { returnDocument: 'after' }
        ) as CleanEmployeeObject | null;
    }

    /**
     * Find employee by MongoDB ObjectId
     */
    async findById(id: string | ObjectId): Promise<CleanEmployeeObject | null> {
        return await this.collection.findOne({ _id: new ObjectId(id) }) as CleanEmployeeObject | null;
    }

    /**
     * Find all employees with optional filter
     */
    async findAll(filter?: Partial<CleanEmployeeObjectInput>): Promise<CleanEmployeeObject[]> {
        return await this.collection.find(filter || {}).toArray() as CleanEmployeeObject[];
    }

    /**
     * Delete employee by MongoDB ObjectId
     */
    async deleteById(id: string | ObjectId): Promise<boolean> {
        const result = await this.collection.deleteOne({ _id: new ObjectId(id) });
        return result.deletedCount > 0;
    }

    /**
     * Find employee by exact name match
     */
    async findByName(name: string): Promise<CleanEmployeeObject | null> {
        return await this.collection.findOne({ 'Name': name }) as unknown as Promise<CleanEmployeeObject | null>;
    }

    /**
     * Find employees by partial name match (case-insensitive)
     */
    async findByNamePartial(namePattern: string): Promise<CleanEmployeeObject[]> {
        return await this.collection
            .find({ 'Name': { $regex: namePattern, $options: 'i' } })
            .toArray() as unknown as Promise<CleanEmployeeObject[]>;
    }

    /**
     * Find employees by programming skill level
     */
    async findBySkill(
        skillName: 'JS, TS' | 'Java' | 'Python' | 'C#' | 'Kotlin' | 'Ruby' | 'Swift',
        level: string
    ): Promise<CleanEmployeeObject[]> {
        return await this.collection.find({ [skillName]: level }).toArray() as CleanEmployeeObject[];
    }

    /**
     * Find employees by grade level
     */
    async findByGrade(grade: typeof Grade): Promise<CleanEmployeeObject[]> {
        return await this.collection.find({ 'Grade': grade }).toArray() as CleanEmployeeObject[];
    }

    /**
     * Find employees by team lead
     */
    async findByTeamLead(teamLead: string): Promise<CleanEmployeeObject[]> {
        return await this.collection.find({ 'Team Lead': teamLead }).toArray() as CleanEmployeeObject[];
    }

    /**
     * Debug method - find records without externalId
     */
    async findRecordsWithoutExternalId(): Promise<Array<{ _id: ObjectId; Name: string }>> {
        return await this.collection
            .find(
                { externalId: { $exists: false } },
                { projection: { _id: 1, Name: 1 } }
            )
            .toArray() as Array<{ _id: ObjectId; Name: string }>;
    }
}
