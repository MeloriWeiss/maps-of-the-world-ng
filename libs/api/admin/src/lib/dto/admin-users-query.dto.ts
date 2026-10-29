import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/** Проверяет параметры поиска и пагинации списка пользователей. */
export class AdminUsersQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;
}
