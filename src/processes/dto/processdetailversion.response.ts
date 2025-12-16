import { PartialType } from '@nestjs/swagger';
import { ProcessVersion } from '../entity/processVersions.entity';

export class ProcessDetailVersionResponse extends PartialType(ProcessVersion) {
  xml: string;
  variables: any;
  activities: Array<any>;
}
