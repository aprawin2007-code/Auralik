import { Catch, ArgumentsHost } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@Catch()
export class WsExceptionFilter extends BaseWsExceptionFilter {
  private readonly logger = new Logger('WsExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const client = host.switchToWs().getClient<Socket>();
    const correlationId = (client.handshake.query.correlationId as string) || 'WS-CONN';

    const message =
      exception instanceof WsException
        ? exception.message
        : exception instanceof Error
        ? exception.message
        : 'WebSocket Error';

    this.logger.error(`[${correlationId}] WebSocket Error: ${message}`, exception instanceof Error ? exception.stack : undefined);

    client.emit('exception', {
      success: false,
      error: {
        code: 'WS_ERROR',
        message,
      },
      meta: {
        timestamp: new Date().toISOString(),
        correlationId,
      },
    });
  }
}
