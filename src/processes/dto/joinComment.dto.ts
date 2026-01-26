import { IsString, IsUUID } from 'class-validator';

export class JoinCommentRoomDto {
  @IsString()
  processId: string;
}
