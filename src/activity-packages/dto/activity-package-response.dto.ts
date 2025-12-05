import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ArgumentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  type: string;

  @ApiPropertyOptional()
  keywordArgument?: string;

  @ApiProperty()
  isRequired: boolean;

  @ApiPropertyOptional()
  defaultValue?: any;
}

export class ReturnValueResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  type: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  displayName?: string;
}

export class ActivityTemplateResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  keyword: string;

  @ApiProperty({ type: [ArgumentResponseDto] })
  @Type(() => ArgumentResponseDto)
  arguments: ArgumentResponseDto[];

  @ApiPropertyOptional({ type: ReturnValueResponseDto })
  @Type(() => ReturnValueResponseDto)
  returnValue?: ReturnValueResponseDto;
}

export class ActivityPackageResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  displayName: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  imageKey?: string;

  @ApiPropertyOptional()
  library?: string;

  @ApiPropertyOptional()
  version?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ type: [ActivityTemplateResponseDto] })
  @Type(() => ActivityTemplateResponseDto)
  activityTemplates: ActivityTemplateResponseDto[];
}
