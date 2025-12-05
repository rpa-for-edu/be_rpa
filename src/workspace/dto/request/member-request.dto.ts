import { IsNotEmpty, IsEmail, IsUUID, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { WorkspaceMemberRole } from '../../entity/workspace-member.entity';

export class InviteWorkspaceMemberDto {
  @IsNotEmpty()
  @IsEmail()
  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @IsNotEmpty()
  @IsEnum(WorkspaceMemberRole)
  @ApiProperty({ enum: WorkspaceMemberRole, example: WorkspaceMemberRole.MEMBER })
  role: WorkspaceMemberRole;
}

export class InviteMemberDto {
  @IsNotEmpty()
  @IsEmail()
  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @IsNotEmpty()
  @IsUUID()
  @ApiProperty({ example: 'role-uuid' })
  roleId: string;
}

export class UpdateMemberRoleDto {
  @IsNotEmpty()
  @IsUUID()
  @ApiProperty({ example: 'new-role-uuid' })
  roleId: string;
}

export class UpdateWorkspaceMemberRoleDto {
  @IsNotEmpty()
  @IsEnum(WorkspaceMemberRole)
  @ApiProperty({ enum: WorkspaceMemberRole, example: WorkspaceMemberRole.OWNER })
  role: WorkspaceMemberRole;
}
