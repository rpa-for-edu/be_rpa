import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ActivityTemplateResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  keyword: string;

  @ApiProperty()
  displayName: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  packageId: string;
}
