import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { WorkspaceMemberRole } from '../../entity/workspace-member.entity';
import { UserResponseDto } from './user-response.dto';

export class WorkspaceMemberResponseDto {
  @ApiProperty({ example: 'member-uuid-123' })
  id: string;

  @ApiProperty({ example: 'workspace-uuid-123' })
  workspaceId: string;

  @ApiProperty({ example: 1 })
  userId: number;

  @ApiProperty({ type: UserResponseDto })
  @Type(() => UserResponseDto)
  user: UserResponseDto;

  @ApiProperty({ enum: WorkspaceMemberRole, example: WorkspaceMemberRole.MEMBER })
  role: WorkspaceMemberRole;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  joinedAt: Date;
}
