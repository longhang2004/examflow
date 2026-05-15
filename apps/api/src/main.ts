import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { TransformResponseInterceptor } from './common/interceptors/transform-response.interceptor';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
  ].filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalInterceptors(new TransformResponseInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('ExamFlow API')
    .setDescription(`
## ExamFlow Online Examination Platform API

### Authentication
Use a Bearer JWT access token from \`POST /auth/login\`.

### Rate Limiting
- General endpoints: 100 requests / 15 minutes
- Auth endpoints: stricter login/register throttling where configured
- AI endpoints: plan-based hourly limits

### Error Format
Errors use the global response envelope: \`{ success: false, error: { code, message } }\`.
    `)
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Auth', 'Register, login, refresh, and logout')
    .addTag('Questions', 'Question bank management')
    .addTag('Exams', 'Exam creation, publishing, and results')
    .addTag('Attempts', 'Exam taking, autosave, submission, and grading')
    .addTag('Analytics', 'Learning and exam analytics')
    .addTag('AI', 'AI question generation and suggestions')
    .addTag('Review', 'Spaced repetition review')
    .addTag('Parent', 'Parent/student linking and progress views')
    .addTag('Anti-cheat', 'Exam monitoring events and reports')
    .addTag('Uploads', 'Media upload endpoints')
    .addTag('Billing', 'Subscription plans, invoices, checkout, and payment webhooks')
    .addTag('Health', 'Service health checks')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, document);

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`API running on http://localhost:${port}`);
  console.log(`Swagger docs at http://localhost:${port}/api-docs`);
}

bootstrap();
