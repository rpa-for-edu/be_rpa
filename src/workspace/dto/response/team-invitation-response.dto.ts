import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { InvitationStatus } from '../../enums/InvitationStatus.enum';
import { UserResponseDto } from './user-response.dto';
import { RoleResponseDto } from './role-response.dto';
import { SimpleTeamResponseDto } from './team-response.dto';
import { SimpleWorkspaceResponseDto } from './workspace-response.dto';

export class TeamInvitationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  teamId: string;

  @ApiProperty({ type: SimpleTeamResponseDto })
  @Type(() => SimpleTeamResponseDto)
  team: SimpleTeamResponseDto & {
    workspace: SimpleWorkspaceResponseDto;
  };

  @ApiProperty()
  invitedEmail: string;

  @ApiPropertyOptional()
  invitedUserId?: number;

  @ApiProperty()
  roleId: string;

  @ApiProperty({ type: RoleResponseDto })
  @Type(() => RoleResponseDto)
  role: RoleResponseDto;

  @ApiProperty()
  invitedById: number;

  @ApiProperty({ type: UserResponseDto })
  @Type(() => UserResponseDto)
  invitedBy: UserResponseDto;

  @ApiProperty({ enum: InvitationStatus })
  status: InvitationStatus;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
