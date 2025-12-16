import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { ActivityPackage } from './activity-packages/schema/activity-package.schema';
import { DocumentTemplateDetail } from './document-template/schema/document-template.schema';
import { ProcessDetail } from './processes/schema/process.schema';
import { ApiResponseInterceptor } from './common/interceptors/response-wrapper.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // enable CORS
  app.enableCors();

  // initialize Swagger
  const config = new DocumentBuilder()
    .setTitle('ErpRPA API')
    .setDescription('API for ErpRPA')
    .setVersion('1.0')
    .addBearerAuth()
    .addOAuth2()
    .addApiKey({ type: 'apiKey', name: 'Service-Key', in: 'header' }, 'Service-Key')
    .build();
  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [ActivityPackage, DocumentTemplateDetail, ProcessDetail],
  });
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  // Enable automatic serialization to exclude sensitive fields
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.useGlobalInterceptors(new ApiResponseInterceptor(app.get(Reflector)));

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  );
  await app.listen(8080);

  console.log(`Application is running on: http://localhost:8080`);
  console.log(`Swagger is running on: http://localhost:8080/api`);
}
bootstrap();
