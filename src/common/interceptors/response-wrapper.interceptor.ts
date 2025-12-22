import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, map } from 'rxjs';

import {
  RESPONSE_WRAPPER_KEY,
  ResponseWrapperOptions,
  SuccessResponseDto,
} from '../dto/api-response.dto';

@Injectable()
export class ApiResponseInterceptor<T> implements NestInterceptor<T, SuccessResponseDto<T>> {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<SuccessResponseDto<T>> {
    const handler = context.getHandler();
    const wrapperConfig = this.reflector.get<ResponseWrapperOptions & { enabled: boolean }>(
      RESPONSE_WRAPPER_KEY,
      handler,
    );

    // Không dùng decorator → return raw
    if (!wrapperConfig?.enabled) {
      return next.handle();
    }

    const res = context.switchToHttp().getResponse();

    return next.handle().pipe(
      map((data) => {
        return new SuccessResponseDto(
          data,
          wrapperConfig.message ?? 'Operation successful',
          res.statusCode,
        );
      }),
    );
  }
}
