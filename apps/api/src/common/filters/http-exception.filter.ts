import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    const errorMessage =
      typeof message === 'object' && 'message' in (message as object)
        ? (message as any).message
        : message;

    const code =
      exception instanceof HttpException && typeof message === 'object' && 'code' in (message as object)
        ? (message as any).code
        : exception instanceof HttpException
          ? exception.constructor.name.replace('Exception', '').toUpperCase()
          : 'INTERNAL_SERVER_ERROR';

    response.status(status).json({
      success: false,
      error: {
        code,
        message: Array.isArray(errorMessage) ? errorMessage[0] : errorMessage,
      },
      timestamp: new Date().toISOString(),
    });
  }
}
