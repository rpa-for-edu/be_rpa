import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client: S3Client;
  private readonly defaultBucket: string;

  constructor(private readonly configService: ConfigService) {
    this.s3Client = new S3Client({
      region: this.configService.get('AWS_REGION'),
      credentials: {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      },
    });
    this.defaultBucket = this.configService.get('AWS_S3_ROBOT_BUCKET_NAME');
  }

  /**
   * Upload file to S3
   */
  async uploadFile(
    key: string,
    body: Buffer | string,
    contentType?: string,
    bucket?: string,
  ): Promise<string> {
    const targetBucket = bucket || this.defaultBucket;
    
    try {
      const command = new PutObjectCommand({
        Bucket: targetBucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      });

      await this.s3Client.send(command);

      const region = this.configService.get('AWS_REGION');
      const url = `https://${targetBucket}.s3.${region}.amazonaws.com/${key}`;
      
      this.logger.log(`File uploaded successfully: ${url}`);
      return url;
    } catch (error) {
      this.logger.error(`Failed to upload file to S3: ${key}`, error);
      throw error;
    }
  }

  /**
   * Get file content from S3
   */
  async getFileContent(key: string, bucket?: string): Promise<string> {
    const targetBucket = bucket || this.defaultBucket;
    
    try {
      const command = new GetObjectCommand({
        Bucket: targetBucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      const content = await response.Body.transformToString();
      
      return content;
    } catch (error) {
      this.logger.error(`Failed to get file from S3: ${key}`, error);
      throw error;
    }
  }

  /**
   * Get file as buffer from S3
   */
  async getFileBuffer(key: string, bucket?: string): Promise<Buffer> {
    const targetBucket = bucket || this.defaultBucket;
    
    try {
      const command = new GetObjectCommand({
        Bucket: targetBucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      const buffer = await response.Body.transformToByteArray();
      
      return Buffer.from(buffer);
    } catch (error) {
      this.logger.error(`Failed to get file buffer from S3: ${key}`, error);
      throw error;
    }
  }

  /**
   * Delete file from S3
   */
  async deleteFile(key: string, bucket?: string): Promise<void> {
    const targetBucket = bucket || this.defaultBucket;
    
    try {
      const command = new DeleteObjectCommand({
        Bucket: targetBucket,
        Key: key,
      });

      await this.s3Client.send(command);
      this.logger.log(`File deleted successfully: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete file from S3: ${key}`, error);
      throw error;
    }
  }

  /**
   * Check if file exists in S3
   */
  async fileExists(key: string, bucket?: string): Promise<boolean> {
    const targetBucket = bucket || this.defaultBucket;
    
    try {
      const command = new HeadObjectCommand({
        Bucket: targetBucket,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      if (error.name === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get S3 URL for a key
   */
  getS3Url(key: string, bucket?: string): string {
    const targetBucket = bucket || this.defaultBucket;
    const region = this.configService.get('AWS_REGION');
    return `https://${targetBucket}.s3.${region}.amazonaws.com/${key}`;
  }
}
