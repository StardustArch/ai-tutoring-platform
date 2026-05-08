import { IsString, IsNotEmpty, MinLength, Matches } from 'class-validator';

export class ResetPasswordDto {
  @IsNotEmpty()
  @IsString()
  token: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8, { message: 'A password deve ter pelo menos 8 caracteres' })
  @Matches(/^(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/, {
    message:
      'A senha deve ter pelo menos 8 caracteres, uma maiúscula, um número e um caractere especial',
  })
  newPassword: string;
}
