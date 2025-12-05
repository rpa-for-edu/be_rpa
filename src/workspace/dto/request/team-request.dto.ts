import { IsString, IsOptional, IsNotEmpty, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTeamDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'Development Team' })
  name: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'Team for developers' })
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ApiPropertyOptional({
    type: [String],
    example: ['google_workspace', 'browser_automation'],
    description: 'Activity Package IDs accessible by this team',
  })
  activityPackageIds?: string[];
}

export class UpdateTeamDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'Updated Team Name' })
  name?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'Updated team description' })
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ApiPropertyOptional({
    type: [String],
    example: ['google_workspace', 'browser_automation'],
    description: 'Activity Package IDs accessible by this team',
  })
  activityPackageIds?: string[];
}
