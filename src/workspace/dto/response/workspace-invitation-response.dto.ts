import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { InvitationStatus } from '../../enums/InvitationStatus.enum';
import { UserResponseDto } from './user-response.dto';
import { SimpleWorkspaceResponseDto } from './workspace-response.dto';
import { WorkspaceMemberRole } from '../../entity/workspace-member.entity';

export class WorkspaceInvitationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  workspaceId: string;

  @ApiProperty({ type: SimpleWorkspaceResponseDto })
  @Type(() => SimpleWorkspaceResponseDto)
  workspace: SimpleWorkspaceResponseDto;

  @ApiProperty()
  invitedEmail: string;

  @ApiPropertyOptional()
  invitedUserId?: number;

  @ApiProperty({ enum: WorkspaceMemberRole })
  role: WorkspaceMemberRole;

  @ApiProperty()
  invitedById: number;

  @ApiProperty({ type: UserResponseDto })
  @Type(() => UserResponseDto)
  invitedBy: UserResponseDto;

  @ApiProperty({ enum: InvitationStatus })
  status: InvitationStatus;

  @ApiProperty()
  createdAt: Date;
}
