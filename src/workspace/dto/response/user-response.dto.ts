import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class UserResponseDto {
  @Expose()
  @ApiProperty({ example: 1 })
  id: number;

  @Expose()
  @ApiProperty({ example: 'John Doe' })
  name: string;

  @Expose()
  @ApiProperty({ example: 'john.doe@example.com' })
  email: string;

  @Expose()
  @ApiPropertyOptional({ example: 'https://avatar.example.com/john.jpg' })
  avatarUrl?: string;
}
