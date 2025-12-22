import { IsString, IsNotEmpty, IsUrl, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMoodleConnectionDto {
  @ApiProperty({
    description: 'Moodle instance base URL',
    example: 'https://moodle.example.com',
  })
  @IsUrl({}, { message: 'Base URL must be a valid URL' })
  @IsNotEmpty({ message: 'Base URL is required' })
  baseUrl: string;

  @ApiProperty({
    description: 'Moodle Web Service token',
    example: 'a1b2c3d4e5f6g7h8i9j0',
  })
  @IsString({ message: 'Token must be a string' })
  @IsNotEmpty({ message: 'Token is required' })
  token: string;

  @ApiProperty({
    description: 'Connection name (optional, will use site name if not provided)',
    example: 'My Moodle Site',
    required: false,
  })
  @IsString({ message: 'Name must be a string' })
  @IsOptional()
  name?: string;
}
