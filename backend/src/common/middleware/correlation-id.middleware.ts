import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const correlationHeader = 'x-correlation-id';
    const correlationId = (req.headers[correlationHeader] as string) || uuidv4();
    
    req.headers[correlationHeader] = correlationId;
    res.setHeader(correlationHeader, correlationId);
    
    next();
  }
}
