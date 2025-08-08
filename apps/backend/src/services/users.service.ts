type CreateUser = { email: string; name: string };

export const usersService = {
    async create(input: CreateUser) {
        // здесь вызов репозитория или внешнего пакета Mongo
        // return usersRepo.insert(input)
        return { id: crypto.randomUUID(), ...input };
    }
};
