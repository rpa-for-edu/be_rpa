import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { UserResponseDto } from './user-response.dto';
import { WorkspaceMemberResponseDto } from './workspace-member-response.dto';
import { TeamResponseDto } from './team-response.dto';

export class WorkspaceResponseDto {
  @ApiProperty({ example: 'workspace-uuid-123' })
  id: string;

  @ApiProperty({ example: 'My Workspace' })
  name: string;

  @ApiPropertyOptional({ example: 'A workspace for our team' })
  description?: string;

  @ApiProperty({ example: 1 })
  ownerId: number;

  @ApiProperty({ type: UserResponseDto })
  @Type(() => UserResponseDto)
  owner: UserResponseDto;

  @ApiProperty({ type: [WorkspaceMemberResponseDto] })
  @Type(() => WorkspaceMemberResponseDto)
  members: WorkspaceMemberResponseDto[];

  @ApiProperty({ type: [TeamResponseDto] })
  @Type(() => TeamResponseDto)
  teams: TeamResponseDto[];

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  updatedAt: Date;
}

export class SimpleWorkspaceResponseDto {
  @ApiProperty({ example: 'workspace-uuid-123' })
  id: string;

  @ApiProperty({ example: 'My Workspace' })
  name: string;

  @ApiPropertyOptional({ example: 'A workspace for our team' })
  description?: string;

  @ApiProperty({ example: 1 })
  ownerId: number;

  @ApiProperty({ type: UserResponseDto })
  @Type(() => UserResponseDto)
  owner: UserResponseDto;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  updatedAt: Date;
}
