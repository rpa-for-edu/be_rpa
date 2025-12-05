import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityPackagesService } from './activity-packages.service';
import { ActivityPackagesController } from './activity-packages.controller';
import { ActivityPackageAccess } from './entity/activity-package-access.entity';
import { ActivityPackage } from './entity/activity-package.entity';
import { ActivityTemplate } from './entity/activity-template.entity';
import { Argument } from './entity/argument.entity';
import { ReturnValue } from './entity/return-value.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ActivityPackage,
      ActivityTemplate,
      Argument,
      ReturnValue,
      ActivityPackageAccess,
    ]),
  ],
  providers: [ActivityPackagesService],
  exports: [ActivityPackagesService],
  controllers: [ActivityPackagesController],
})
export class ActivityPackagesModule {}
