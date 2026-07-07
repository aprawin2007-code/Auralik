import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import helmet from 'helmet';
import * as compression from 'compression';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { LogBuffer } from './common/utils/log-buffer.util';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

LogBuffer.initialize();

async function bootstrap() {
  const isProduction = process.env.NODE_ENV === 'production';
  const winstonLogger = WinstonModule.createLogger({
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.ms(),
          isProduction
            ? winston.format.json()
            : winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
              )
        ),
      }),
    ],
  });

  const app = await NestFactory.create(AppModule, { logger: winstonLogger });

  const logger = new Logger('Bootstrap');

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 3000);
  const apiPrefix = configService.get<string>('app.apiPrefix', 'api/v1');
  const corsOrigins = configService.get<string[]>('app.corsOrigins', ['*']);

  // Global prefixes and routes config
  app.setGlobalPrefix(apiPrefix);

  // Security headers & compression
  app.use(helmet());
  app.use(compression());

  // CORS config
  app.enableCors({
    origin: corsOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global exception filters
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global interceptors
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  // Enable graceful shutdown hooks
  app.enableShutdownHooks();

  // OpenAPI Swagger Documentation
  if (configService.get<string>('app.env') !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Aura Video Chat Platform API')
      .setDescription('Core REST APIs for Aura anonymous matching, session management, and rooms')
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
    logger.log(`OpenAPI Swagger documentation established at: http://localhost:${port}/docs`);
  }

  await app.listen(port);
  logger.log(`Aura Application is running in ${configService.get<string>('app.env')} mode on port: ${port}`);
}

bootstrap();
