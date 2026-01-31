import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  path: '/robot-report-logs-realtime',
  cors: { origin: '*' },
})
export class RobotReportRealtimeGateway {
  @WebSocketServer()
  server: Server;

  private room(processId: string) {
    return `process:${processId}`;
  }

  /** FE join khi bấm Run */
  @SubscribeMessage('joinProcess')
  joinProcess(
    @MessageBody() data: { processId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(this.room(data.processId));
  }

  /** Robot push event */
  @SubscribeMessage('robotEvent')
  handleRobotEvent(
    @MessageBody() evt: any,
  ) {
    console.log('Robot event received via WS:', evt);
    const { processId } = evt;
    if (!processId) return;

    this.server
      .to(this.room(processId))
      .emit('robotEvent', evt);
  }
  /** FE gửi continueStep → forward đến robot trong room */
@SubscribeMessage('continueStep')
handleContinueStep(
  @MessageBody() data: { processId: string },
  @ConnectedSocket() client: Socket,
) {
  console.log('continueStep received:', data);
  const { processId } = data;
  if (!processId) return;

  // Broadcast continueStep to everyone in the room (including robot)
  this.server
    .to(this.room(processId))
    .emit('continueStep', data);
}
}
