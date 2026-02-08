import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateArgumentDto {
  @ApiProperty({ description: 'Argument name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Argument description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Argument type (string, number, boolean, list, etc.)' })
  @IsString()
  type: string;

  @ApiPropertyOptional({ description: 'Keyword argument name in Python' })
  @IsOptional()
  @IsString()
  keywordArgument?: string;

  @ApiPropertyOptional({ description: 'Is this argument required?' })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional({ description: 'Default value' })
  @IsOptional()
  defaultValue?: any;
}

export class CreateReturnValueDto {
  @ApiProperty({ description: 'Return type' })
  @IsString()
  type: string;

  @ApiPropertyOptional({ description: 'Return description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Display name for return value' })
  @IsOptional()
  @IsString()
  displayName?: string;
}

export class CreateTemplateDto {
  @ApiProperty({ description: 'Template name', example: 'Create Sales Order' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Template description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Robot Framework keyword', example: 'Create Sales Order' })
  @IsString()
  keyword: string;

  @ApiPropertyOptional({ description: 'Keyword name for display' })
  @IsOptional()
  @IsString()
  keywordName?: string;

  @ApiPropertyOptional({ description: 'Python method name' })
  @IsOptional()
  @IsString()
  pythonMethod?: string;

  @ApiPropertyOptional({ description: 'Arguments for this template', type: [CreateArgumentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateArgumentDto)
  arguments?: CreateArgumentDto[];

  @ApiPropertyOptional({ description: 'Return value definition' })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateReturnValueDto)
  returnValue?: CreateReturnValueDto;
}

export class UpdateTemplateDto extends PartialType(CreateTemplateDto) {}
