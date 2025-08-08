import { CreateUserInput } from './users.schemas.js';
import { usersService } from '@app/services/users.service';

export const createUserHandler = async (data: unknown) => {
    const input = CreateUserInput.parse(data);
    return usersService.create(input);
};
