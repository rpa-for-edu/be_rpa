import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class DashboardQueryDto {
  @ApiPropertyOptional({
    description: 'ISO date string to filter from',
    example: '2025-11-23T04:00:00Z',
  })
  @IsOptional()
  @IsString()
  date?: string;
}
