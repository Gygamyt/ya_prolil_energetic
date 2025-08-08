import { Db, Collection, ObjectId } from 'mongodb';
import { CleanEmployeeObject } from "../collections/collections.ts";

export class EmployeeRepository {
    private collection: Collection<CleanEmployeeObject>;

    constructor(db: Db) {
        this.collection = db.collection<CleanEmployeeObject>('employees.raw');
    }

    /**
     * Create a new employee record
     */
    async create(employee: Omit<CleanEmployeeObject, '_id'>): Promise<CleanEmployeeObject> {
        const result = await this.collection.insertOne(employee as CleanEmployeeObject);
        return { ...employee, _id: result.insertedId } as CleanEmployeeObject;
    }

    /**
     * Find employee by ID
     */
    async findById(id: string | ObjectId): Promise<CleanEmployeeObject | null> {
        return await this.collection.findOne({ _id: new ObjectId(id) });
    }

    /**
     * Find all employees with optional filters
     */
    async findAll(filter?: Partial<CleanEmployeeObject>): Promise<CleanEmployeeObject[]> {
        return await this.collection.find(filter || {}).toArray();
    }

    /**
     * Delete employee by ID
     */
    async deleteById(id: string | ObjectId): Promise<boolean> {
        const result = await this.collection.deleteOne({ _id: new ObjectId(id) });
        return result.deletedCount > 0;
    }

    /**
     * Find employees by skill level
     */
    async findBySkill(skillName: keyof CleanEmployeeObject, level: string): Promise<CleanEmployeeObject[]> {
        return await this.collection.find({ [skillName]: level }).toArray();
    }

    /**
     * Find employees by team lead
     */
    async findByTeamLead(teamLead: string): Promise<CleanEmployeeObject[]> {
        return await this.collection.find({ 'Team Lead': teamLead }).toArray();
    }

    /**
     * Find employee by exact full name match
     * @param name Full name to search for
     * @returns The matching employee or null if not found
     */
    async findByName(name: string): Promise<CleanEmployeeObject | null> {
        return this.collection.findOne({ 'ФИО': name });
    }

    /**
     * Find employees by partial name match (case-insensitive)
     * @param namePattern Substring or regex pattern to match in the name
     * @returns Array of matching employees
     */
    async findByNamePartial(namePattern: string): Promise<CleanEmployeeObject[]> {
        return this.collection
            .find({ 'ФИО': { $regex: namePattern, $options: 'i' } })
            .toArray();
    }
}
