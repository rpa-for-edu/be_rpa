import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn } from 'class-validator';

export class WorkspaceDashboardQueryDto {
  @ApiPropertyOptional({
    description: 'ISO date string to filter from',
    example: '2025-11-23T04:00:00Z',
  })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional({
    description: 'Time bucket granularity: minute, hour, or day',
    example: 'hour',
    enum: ['minute', 'hour', 'day'],
  })
  @IsOptional()
  @IsIn(['minute', 'hour', 'day'])
  granularity?: string;
}
