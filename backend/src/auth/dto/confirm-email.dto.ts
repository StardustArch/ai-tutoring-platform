import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ConfirmEmailDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  token: string;
}
