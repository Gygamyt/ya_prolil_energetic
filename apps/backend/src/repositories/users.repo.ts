// import { mongo } from '@repo/mongo';
export const usersRepo = {
    async insert(data: { email: string; name: string }) {
        // const col = mongo.collection('users');
        // const { insertedId } = await col.insertOne(data);
        // return { id: insertedId.toString(), ...data };
        return { id: 'todo', ...data };
    }
};
