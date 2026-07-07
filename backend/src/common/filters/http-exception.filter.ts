import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const correlationId = request.headers['x-correlation-id'] as string || 'N/A';

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.message
        : 'Internal Server Error';

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    let details: any = null;
    if (exceptionResponse && typeof exceptionResponse === 'object') {
      details = (exceptionResponse as any).message || exceptionResponse;
    }

    this.logger.error(
      `[${correlationId}] Route: ${request.method} ${request.url} - Error: ${message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json({
      success: false,
      error: {
        code: `HTTP_ERROR_${status}`,
        message,
        details,
      },
      meta: {
        timestamp: new Date().toISOString(),
        correlationId,
      },
    });
  }
}
