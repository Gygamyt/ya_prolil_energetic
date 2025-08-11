import { MongoClient, Db } from 'mongodb';
import { logger } from "@repo/logger/src";
import { dbEnv } from "../utils";
import { prefixes } from "@repo/shared/src";

const client = new MongoClient(dbEnv.MONGODB_URI);
const MONGODB_DB_NAME = dbEnv.MONGODB_DB_NAME;

let dbInstance: Db | null = null;

export class MongoDBClient {
    /**
     * Establishes a single, reusable connection to the MongoDB server and returns the database instance.
     *
     * On the first call, this function will:
     *  1. Connect the MongoClient to the server URI.
     *  2. Select the database by name.
     *  3. Cache the Db instance for reuse in subsequent calls.
     *
     * Subsequent calls return the cached Db instance without reconnecting.
     *
     * @returns {Promise<Db>} A promise that resolves to the connected Db instance.
     * @throws {Error} If the connection attempt fails.
     */
    public static async getClient(): Promise<Db> {
        if (!dbInstance) {
            try {
                await client.connect();
                dbInstance = client.db(MONGODB_DB_NAME);
                logger.info(`${prefixes.mongo} ✔️ Connected to MongoDB database: ${MONGODB_DB_NAME}`);
            } catch (err) {
                logger.error(`${prefixes.mongo} ❌ Failed to connect to MongoDB:`, err);
                throw err;
            }
        }
        return dbInstance;
    }

    /**
     * Gracefully closes the MongoClient connection if it is currently open.
     *
     * Useful for application shutdown or testing teardown to ensure all connections are released.
     *
     * @returns {Promise<void>} A promise that resolves once the client connection is closed.
     */
    public static async close(): Promise<void> {
        if (client) {
            try {
                await client.close();
                dbInstance = null;
                logger.info(`${prefixes.mongo} 🔒 MongoDB connection closed`);
            } catch (err) {
                logger.error(`${prefixes.mongo} ⚠️ Error closing MongoDB connection:`, err);
                throw err;
            }
        }
    }
}
