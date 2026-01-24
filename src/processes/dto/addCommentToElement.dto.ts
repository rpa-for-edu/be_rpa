import { IsNotEmpty, IsString } from 'class-validator';

export class AddCommentToElementDto {
  @IsString()
  @IsNotEmpty()
  processId: string;

  @IsString()
  @IsNotEmpty()
  commentText: string;

  @IsString()
  @IsNotEmpty()
  elementId: string;
}
