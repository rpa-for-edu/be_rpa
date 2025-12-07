import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddPackageToTeamDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    example: 'google_workspace',
    description: 'Activity Package ID to grant access to',
  })
  packageId: string;
}

export class RemovePackageFromTeamDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    example: 'google_workspace',
    description: 'Activity Package ID to revoke access from',
  })
  packageId: string;
}
