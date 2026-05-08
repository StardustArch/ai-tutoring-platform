import { IsArray, IsInt, ArrayMaxSize, ArrayUnique } from 'class-validator';

export class ManageClassTopicsDto {
  @IsArray()
  @ArrayMaxSize(50)
  @ArrayUnique() 
  @IsInt({ each: true })
  topicosIds: number[];
}