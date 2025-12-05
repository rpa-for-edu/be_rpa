import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { UserResponseDto } from './user-response.dto';
import { RoleResponseDto } from './role-response.dto';

export class TeamMemberResponseDto {
  @ApiProperty({ example: 'team-member-uuid-123' })
  id: string;

  @ApiProperty({ example: 'team-uuid-123' })
  teamId: string;

  @ApiProperty({ example: 1 })
  userId: number;

  @ApiProperty({ type: UserResponseDto })
  @Type(() => UserResponseDto)
  user: UserResponseDto;

  @ApiProperty({ example: 'role-uuid-123' })
  roleId: string;

  @ApiProperty({ type: RoleResponseDto })
  @Type(() => RoleResponseDto)
  role: RoleResponseDto;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  joinedAt: Date;
}
