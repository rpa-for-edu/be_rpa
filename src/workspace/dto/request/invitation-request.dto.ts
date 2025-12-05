import { IsNotEmpty, IsUUID, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { InvitationStatus } from '../../enums/InvitationStatus.enum';

export class RespondInvitationDto {
  @IsNotEmpty()
  @IsUUID()
  @ApiProperty({ example: 'invitation-uuid' })
  invitationId: string;

  @IsNotEmpty()
  @IsEnum(InvitationStatus)
  @ApiProperty({
    enum: [InvitationStatus.ACCEPTED, InvitationStatus.REJECTED],
    example: InvitationStatus.ACCEPTED,
  })
  status: InvitationStatus.ACCEPTED | InvitationStatus.REJECTED;
}
