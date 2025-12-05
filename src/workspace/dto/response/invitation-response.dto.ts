import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { TeamInvitationResponseDto } from './team-invitation-response.dto';
import { WorkspaceInvitationResponseDto } from './workspace-invitation-response.dto';

export class InvitationResponseDto {
  @ApiProperty({ type: [TeamInvitationResponseDto] })
  @Type(() => TeamInvitationResponseDto)
  teamInvitations: TeamInvitationResponseDto[];

  @ApiProperty({ type: [WorkspaceInvitationResponseDto] })
  @Type(() => WorkspaceInvitationResponseDto)
  workspaceInvitations: WorkspaceInvitationResponseDto[];
}
