import { SetMetadata } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiResponseDto<T = any> {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 'Operation successful' })
  message: string;

  @ApiPropertyOptional()
  data?: T;

  @ApiPropertyOptional()
  error?: string;

  constructor(partial: Partial<ApiResponseDto<T>>) {
    Object.assign(this, partial);
  }
}

export class SuccessResponseDto<T = any> extends ApiResponseDto<T> {
  constructor(data: T, message: string = 'Operation successful', statusCode: number = 200) {
    super({
      success: true,
      statusCode,
      message,
      data,
    });
  }
}

export class ErrorResponseDto extends ApiResponseDto {
  constructor(error: string, message: string = 'Operation failed', statusCode: number = 400) {
    super({
      success: false,
      statusCode,
      message,
      error,
    });
  }
}

export const RESPONSE_WRAPPER_KEY = 'response_wrapper';

export interface ResponseWrapperOptions {
  message?: string;
}

export const ApiResponseWrapper = (options?: ResponseWrapperOptions) =>
  SetMetadata(RESPONSE_WRAPPER_KEY, {
    enabled: true,
    ...options,
  });
