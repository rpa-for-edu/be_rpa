import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { Language } from '../entity/user.entity';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsEnum(Language)
  language?: Language;
}