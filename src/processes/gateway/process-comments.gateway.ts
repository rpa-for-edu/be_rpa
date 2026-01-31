import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { ProcessesService } from '../processes.service';
import { Server, Socket } from 'socket.io';
import { AddCommentToElementDto } from '../dto/addCommentToElement.dto';
import { JoinCommentRoomDto } from '../dto/joinComment.dto';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { AddCommentWSDto } from '../dto/addCommentWS.dto';
import { content } from 'googleapis/build/src/apis/content';

@WebSocketGateway({
  namespace: '/ws/process-comments',
  cors: { origin: '*' },
})
@UseGuards(JwtAuthGuard)
export class ProcessCommentsGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly processesService: ProcessesService) {}

  private room(processId: string) {
    return `process:${processId}`;
  }

  // Join when open BPMN
  @SubscribeMessage('joinCommentRoom')
  joinRoom(@MessageBody() dto: JoinCommentRoomDto, @ConnectedSocket() client: Socket) {
    client.join(this.room(dto.processId));
  }

  // Create comment
  @SubscribeMessage('addComment')
  async create(@MessageBody() dto: AddCommentWSDto, @ConnectedSocket() client: Socket) {
    console.log('Add comment received via WS:', dto);
    const addCommentDto: AddCommentToElementDto = {
      processId: dto.processId,
      commentText: dto.commentText,
      elementId: dto.elementId,
    };
    const comment = await this.processesService.addCommentToElement(
      client.data.userId,
      addCommentDto,
    );
    const returnComment = {
      id: comment.id,
      process_id: comment.process_id,
      node_id: comment.node_id,
      createdAt: comment.createdAt,
      commentText: comment.commentText,
      process_version_id: comment.process_version_id,
      user: {
        id: dto.userId,
        name: dto.userName,
        avatarUrl: dto.userAvatar,
        email: dto.userEmail,
      },
    };
    this.server.to(this.room(dto.processId)).emit('commentAdded', returnComment);
  }
}
