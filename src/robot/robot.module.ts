import { Module } from '@nestjs/common';
import { RobotController } from './robot.controller';
import { RobotService } from './robot.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Robot } from './entity/robot.entity';
import { Process } from 'src/processes/entity/process.entity';
import { ConnectionModule } from 'src/connection/connection.module';
import { ProcessesService } from 'src/processes/processes.service';
import { ProcessesModule } from 'src/processes/processes.module';

@Module({
  controllers: [RobotController],
  providers: [RobotService],
  imports: [TypeOrmModule.forFeature([Robot, Process]), ConnectionModule, ProcessesModule],
})
export class RobotModule {}
