import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { RoleResponseDto } from './role-response.dto';
import { TeamMemberResponseDto } from './team-member-response.dto';

export class TeamResponseDto {
  @ApiProperty({ example: 'team-uuid-123' })
  id: string;

  @ApiProperty({ example: 'Development Team' })
  name: string;

  @ApiPropertyOptional({ example: 'Team for developers' })
  description?: string;

  @ApiProperty({ example: 'workspace-uuid-123' })
  workspaceId: string;

  @ApiProperty({ type: [RoleResponseDto] })
  @Type(() => RoleResponseDto)
  roles: RoleResponseDto[];

  @ApiProperty({ type: [TeamMemberResponseDto] })
  @Type(() => TeamMemberResponseDto)
  members: TeamMemberResponseDto[];

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  updatedAt: Date;
}

export class SimpleTeamResponseDto {
  @ApiProperty({ example: 'team-uuid-123' })
  id: string;

  @ApiProperty({ example: 'Development Team' })
  name: string;

  @ApiPropertyOptional({ example: 'Team for developers' })
  description?: string;

  @ApiProperty({ example: 'workspace-uuid-123' })
  workspaceId: string;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  updatedAt: Date;
}
