import { IsArray, IsNotEmpty, IsNumberString, IsObject, IsString } from 'class-validator';
import { Activity, Variables } from '../schema/process.schema';

export class CreateProcessVersionDto {
  @IsString()
  @IsNotEmpty()
  processId: string;

  @IsString()
  @IsNotEmpty()
  xml: string;

  @IsNotEmpty()
  @IsObject()
  variables: Variables;

  @IsNotEmpty()
  @IsArray()
  activities: Activity[];

  @IsString()
  @IsNotEmpty()
  tag: string;

  @IsString()
  description: string;
}
