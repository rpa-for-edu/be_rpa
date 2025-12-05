import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PermissionResponseDto } from './permission-response.dto';
import { ActivityTemplateResponseDto } from './activity-template-response.dto';

export class RoleResponseDto {
  @ApiProperty({ example: 'role-uuid-123' })
  id: string;

  @ApiProperty({ example: 'Developer' })
  name: string;

  @ApiPropertyOptional({ example: 'Can view and execute processes' })
  description?: string;

  @ApiProperty({ example: 'team-uuid-123' })
  teamId: string;

  @ApiProperty({ example: false })
  isDefault: boolean;

  @ApiProperty({ type: [PermissionResponseDto] })
  @Type(() => PermissionResponseDto)
  permissions: PermissionResponseDto[];

  @ApiPropertyOptional({ type: [ActivityTemplateResponseDto] })
  @Type(() => ActivityTemplateResponseDto)
  activityTemplates?: ActivityTemplateResponseDto[];

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  updatedAt: Date;
}
