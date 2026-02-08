import { Module, Global } from '@nestjs/common';
import { S3Service } from 'src/common/services/s3.service';

@Global()
@Module({
  providers: [S3Service],
  exports: [S3Service],
})
export class S3Module {}
