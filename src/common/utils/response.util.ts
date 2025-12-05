import { ApiResponseDto, SuccessResponseDto } from '../dto/api-response.dto';

export class ResponseUtil {
  /**
   * Create a success response
   */
  static success<T>(
    data: T,
    message: string = 'Operation successful',
    statusCode: number = 200,
  ): ApiResponseDto<T> {
    return new SuccessResponseDto(data, message, statusCode);
  }

  /**
   * Create a success response with custom message
   */
  static successWithMessage<T>(
    message: string,
    data?: T,
    statusCode: number = 200,
  ): ApiResponseDto<T> {
    return new SuccessResponseDto(data, message, statusCode);
  }

  /**
   * Create a created response (201)
   */
  static created<T>(data: T, message: string = 'Resource created successfully'): ApiResponseDto<T> {
    return new SuccessResponseDto(data, message, 201);
  }

  /**
   * Create a no content response (204)
   */
  static noContent(message: string = 'Operation completed successfully'): ApiResponseDto {
    return new SuccessResponseDto(null, message, 204);
  }

  /**
   * Create a deleted response
   */
  static deleted(message: string = 'Resource deleted successfully'): ApiResponseDto {
    return new SuccessResponseDto(null, message, 200);
  }

  /**
   * Create an updated response
   */
  static updated<T>(data: T, message: string = 'Resource updated successfully'): ApiResponseDto<T> {
    return new SuccessResponseDto(data, message, 200);
  }
}
