import { IsArray, IsInt } from 'class-validator';

export class ManageClassTopicsDto {
  @IsArray()
  @IsInt({ each: true })
  topicosIds: number[]; // Lista de IDs que o professor marcou (ex: [1, 2, 5])
}