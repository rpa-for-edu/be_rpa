import { IsString, IsNotEmpty, IsEmpty, IsOptional } from 'class-validator';

export class CreateProcessDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  description: string;

  @IsString()
  @IsNotEmpty()
  xml: string;

  @IsString()
  @IsOptional()
  parentId?: string;
}