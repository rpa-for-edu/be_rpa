import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { AuthorizationProvider } from 'src/connection/entity/connection.entity';

export class CreateWorkspaceConnectionDto {
  @ApiProperty({
    description: 'Connection name',
    example: 'My Google Drive Connection',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Authorization provider',
    enum: AuthorizationProvider,
    example: AuthorizationProvider.G_DRIVE,
  })
  @IsEnum(AuthorizationProvider)
  @IsNotEmpty()
  provider: AuthorizationProvider;

  @ApiProperty({
    description: 'Access token',
    example: 'ya29.a0AfH6SMBx...',
  })
  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @ApiProperty({
    description: 'Refresh token',
    example: '1//0gHdP9...',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
