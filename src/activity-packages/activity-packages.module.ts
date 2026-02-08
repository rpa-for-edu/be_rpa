import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityPackagesService } from './activity-packages.service';
import { ActivityPackagesController } from './activity-packages.controller';
import { ActivityPackageAccess } from './entity/activity-package-access.entity';
import { ActivityPackage } from './entity/activity-package.entity';
import { ActivityTemplate } from './entity/activity-template.entity';
import { Argument } from './entity/argument.entity';
import { ReturnValue } from './entity/return-value.entity';
import { PythonParserService } from './services/python-parser.service';
import { S3Module } from 'src/common/modules/s3.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ActivityPackage,
      ActivityTemplate,
      Argument,
      ReturnValue,
      ActivityPackageAccess,
    ]),
    S3Module,
  ],
  providers: [ActivityPackagesService, PythonParserService],
  exports: [ActivityPackagesService, PythonParserService],
  controllers: [ActivityPackagesController],
})
export class ActivityPackagesModule {}
