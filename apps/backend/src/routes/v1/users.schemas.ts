import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

export const User = z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: z.string().min(1)
});

export const CreateUserInput = User.pick({ email: true, name: true });

export const CreateUserJsonSchema = zodToJsonSchema(CreateUserInput, 'CreateUserInput');
export const UserJsonSchema = zodToJsonSchema(User, 'User');
