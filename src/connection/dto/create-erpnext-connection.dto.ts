import { IsString, IsNotEmpty, IsUrl, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateERPNextConnectionDto {
  @ApiProperty({
    description: 'ERPNext instance base URL',
    example: 'https://erpnext.example.com',
  })
  @IsUrl({}, { message: 'Base URL must be a valid URL' })
  @IsNotEmpty({ message: 'Base URL is required' })
  baseUrl: string;

  @ApiProperty({
    description: 'ERPNext API Token',
    example: 'api_key:api_secret',
  })
  @IsString({ message: 'Token must be a string' })
  @IsNotEmpty({ message: 'Token is required' })
  token: string;

  @ApiProperty({
    description: 'Connection name (optional, will use site name if not provided)',
    example: 'My ERPNext Site',
    required: false,
  })
  @IsString({ message: 'Name must be a string' })
  @IsOptional()
  name?: string;
}
