import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

// Herda tudo do Create, mas opcional, exceto a password que removemos aqui por segurança
export class UpdateUserDto extends PartialType(CreateUserDto) {}