import { PartialType } from '@nestjs/swagger';
import { CreateProcessDto } from './create-process.dto';

export class CreateProcessAllParamsDto extends PartialType(CreateProcessDto) {
  variables: any;
  activities: Array<any>;
}
