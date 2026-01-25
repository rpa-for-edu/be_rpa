import { PartialType } from '@nestjs/swagger';
import { AddCommentToElementDto } from './addCommentToElement.dto';
import { IsString } from 'class-validator';

export class AddCommentWSDto extends PartialType(AddCommentToElementDto) {
  @IsString()
  userId: string;
  @IsString()
  userName: string;
  @IsString()
  userAvatar: string;
  @IsString()
  userEmail: string;
}
