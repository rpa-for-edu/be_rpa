import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { AuthorizationProvider } from 'src/connection/entity/connection.entity';

export class UpdateWorkspaceConnectionDto {
  @ApiProperty({
    description: 'Access token',
    example: 'ya29.a0AfH6SMBx...',
    required: false,
  })
  @IsString()
  @IsOptional()
  accessToken?: string;

  @ApiProperty({
    description: 'Refresh token',
    example: '1//0gHdP9...',
    required: false,
  })
  @IsString()
  @IsOptional()
  refreshToken?: string;
}
