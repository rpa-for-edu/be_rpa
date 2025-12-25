import { ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectRepository } from '@nestjs/typeorm';
import { Model } from 'mongoose';
import { Process } from 'src/processes/entity/process.entity';
import { ProcessDetail, ProcessForValidation } from 'src/processes/schema/process.schema';
import { DataSource, Repository } from 'typeorm';
import { ProcessesValidateService } from './processes-validate.service';
import { CreateProcessDto } from './dto/create-process.dto';
import {
  UnableToCreateProcessException,
  ProcessNotFoundException,
  UserNotFoundException,
  UnableToDeleteProcessException,
} from 'src/common/exceptions';
import { UpdateProcessDto } from './dto/update-process.dto';
import { SaveProcessDto } from './dto/save-process.dto';
import { UsersService } from 'src/users/users.service';
import { NotificationService } from 'src/notification/notification.service';
import { NotificationType } from 'src/notification/entity/notification.entity';
import { CreateProcessVersionDto } from './dto/create-process-version.dto';
import { ProcessVersion } from './entity/processVersions.entity';
import { ProcessDetailVersionResponse } from './dto/processdetailversion.response';

@Injectable()
export class ProcessesService {
  constructor(
    private dataSource: DataSource,
    @InjectRepository(Process)
    private processRepository: Repository<Process>,
    @InjectRepository(ProcessVersion)
    private processVersionRepository: Repository<ProcessVersion>,
    @InjectModel(ProcessDetail.name)
    private processDetailModel: Model<ProcessDetail>,
    private readonly processesValidateService: ProcessesValidateService,
    private readonly usersService: UsersService,
    private readonly notificationService: NotificationService,
  ) {}

  async getProcessesCount(userId: number) {
    return this.processRepository.count({ where: { userId } });
  }

  async getProcesses(
    userId: number,
    options?: {
      limit?: number;
      page?: number;
    },
  ) {
    const { limit, page } = options;
    return this.processRepository
      .createQueryBuilder('process')
      .leftJoinAndSelect('process.sharedByUser', 'user', 'user.id = process.sharedByUserId')
      .where('process.userId = :userId', { userId })
      .orderBy('process.updatedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();
  }

  async createProcess(userId: number, createProcessDto: CreateProcessDto) {
    const processEntity = await this.processRepository.save({
      ...createProcessDto,
      userId,
    });
    try {
      await this.createProcessVersion(userId, {
        processId: processEntity.id,
        xml: createProcessDto.xml,
        variables: {},
        activities: [],
        tag: 'Initial Version',
        description: 'The first version of the process',
      });
    } catch (error) {
      await this.processRepository.delete({ id: processEntity.id, userId });
      throw new UnableToCreateProcessException();
    }
    return processEntity;
  }

  async getProcess(userId: number, processId: string) {
    const process = await this.processRepository.findOne({
      where: { id: processId, userId },
    });
    if (!process) {
      throw new ProcessNotFoundException();
    }
    //! Migrate pre-versioned process detail to versioned one, will Delete after migration
    const preProcess = await this.processDetailModel
      .findById(`${userId}.${processId}`)
      .lean()
      .exec();
    if (preProcess && !preProcess.versionId) {
      await this.createProcessVersion(userId, {
        processId: processId,
        xml: preProcess.xml,
        variables: preProcess.variables,
        activities: preProcess.activities,
        tag: 'Initial Version',
        description: 'The first version of the process',
      });
      await this.processDetailModel.deleteOne({ _id: `${userId}.${processId}` });
    }

    return this.processDetailModel
      .findById({ _id: `${userId}.${processId}.${process.version}` })
      .lean()
      .exec();
  }

  async updateProcess(userId: number, processId: string, updateProcessDto: UpdateProcessDto) {
    const process = await this.processRepository.findOne({
      where: { id: processId, userId },
    });
    if (!process) {
      throw new ProcessNotFoundException();
    }
    return this.processRepository.update(processId, updateProcessDto);
  }

  async saveProcess(userId: number, processId: string, saveProcessDto: SaveProcessDto) {
    const process = await this.processRepository.findOne({
      where: { id: processId, userId },
    });
    if (!process) {
      throw new ProcessNotFoundException();
    }

    // NOTE: disable validation temporarily
    // const processDetail = new this.processDetailModel({
    //   _id: processId,
    //   ...saveProcessDto,
    // });
    // const processForValidation = new ProcessForValidation(processDetail);
    // await this.processesValidateService.validateProcess(userId, processForValidation);

    await this.processDetailModel.updateOne(
      { _id: `${userId}.${processId}.${process.version}` },
      {
        ...saveProcessDto,
      },
    );
    // return this.processRepository.update(
    //   {
    //     id: processId,
    //     userId,
    //   },
    //   {
    //     updatedAt: new Date(),
    //     version: process.version + 1,
    //   },
    // );
    return this.processVersionRepository.update(
      { processId: processId, isCurrent: true },
      { updatedAt: new Date() },
    );
  }

  async deleteProcess(userId: number, processId: string) {
    const process = await this.processRepository.findOne({
      where: { id: processId, userId },
    });
    if (!process) {
      return null;
    }
    await this.processDetailModel.deleteOne({ _id: `${userId}.${processId}.${process.version}` });
    return this.processRepository.delete({ id: processId, userId });
  }

  async shareProcess(userId: number, processId: string, shareToEmails: string[]) {
    const process = await this.processRepository.findOne({
      where: { id: processId, userId },
      relations: ['user'],
    });
    if (!process) {
      throw new ProcessNotFoundException();
    }
    if (process.sharedByUserId) {
      throw new ForbiddenException();
    }

    const promises = shareToEmails.map(async (email) => {
      const user = await this.usersService.findOneByEmail(email);
      if (!user) {
        throw new UserNotFoundException();
      }
      await this.createSharedProcess(process, user.id);
      await this.notificationService.createNotification({
        title: `Process has been shared with you`,
        content: `Process ${process.name} has been shared with you by ${process.user.email}`,
        type: NotificationType.PROCESS_SHARED,
        userId: user.id,
      });
    });
    await Promise.all(promises);
  }

  private async createSharedProcess(process: Process, shareTo: number) {
    await this.processRepository.save({
      id: process.id,
      userId: shareTo,
      sharedByUserId: process.userId,
      version: 0,
      name: process.name,
      description: process.description,
    });

    const processDetail = await this.processDetailModel.findById(`${process.userId}.${process.id}`);
    const newSharedProcessDetail = await new this.processDetailModel({
      _id: `${shareTo}.${process.id}`,
      xml: processDetail.xml,
      variables: processDetail.variables,
      activities: processDetail.activities,
    });

    this.processBeforeShare(newSharedProcessDetail);

    await newSharedProcessDetail.save();
  }

  processBeforeShare(processDetail: ProcessDetail) {
    // remove the connection
    processDetail.activities.forEach((activity) => {
      for (const argumentName in activity.properties.arguments) {
        if (argumentName === 'Connection') {
          activity.properties.arguments[argumentName].value = '';
        }
      }
    });
  }

  async getSharedToOfProcess(userId: number, processId: string) {
    const process = await this.processRepository.findOne({
      where: { id: processId, userId },
    });
    if (!process) {
      throw new ProcessNotFoundException();
    }
    if (process.sharedByUserId) {
      throw new ForbiddenException();
    }

    return this.processRepository
      .createQueryBuilder('process')
      .leftJoinAndSelect('process.user', 'user', 'user.id = process.userId')
      .where('process.id = :processId', { processId })
      .andWhere('process.userId != :userId', { userId })
      .getMany();
  }

  //! ===== PROCESS VERSION =====!//
  async createProcessVersion(userId: number, createProcessVersionDto: CreateProcessVersionDto) {
    const process = await this.processRepository.findOne({
      where: { id: createProcessVersionDto.processId, userId },
    });
    if (!process) {
      throw new ProcessNotFoundException();
    }
    await this.processVersionRepository.update(
      { processId: process.id, isCurrent: true },
      { isCurrent: false },
    );

    const processVersionEntity = await this.processVersionRepository.save({
      processId: createProcessVersionDto.processId,
      createdBy: userId,
      tag: createProcessVersionDto.tag,
      vdescription: createProcessVersionDto.description,
      updatedAt: new Date(),
      isCurrent: true,
      creator: { id: userId },
    });
    const processVersionDetail = new this.processDetailModel({
      _id: `${userId}.${process.id}.${process.version + 1}`,
      processId: process.id,
      versionId: processVersionEntity.id,
      xml: createProcessVersionDto.xml,
      variables: createProcessVersionDto.variables,
      activities: createProcessVersionDto.activities,
    });
    try {
      await processVersionDetail.save();
      await this.processVersionRepository.save(processVersionEntity);
      await this.processRepository.update(
        { id: process.id, userId },
        {
          updatedAt: new Date(),
          version: process.version + 1,
        },
      );
      return { processVersionEntity, version: process.version + 1 };
    } catch (error) {
      console.error(error);
      await this.processVersionRepository.delete(processVersionEntity.id);
      throw new UnableToCreateProcessException();
    }
  }

  async createProcessVersionFromCurrent(
    userId: number,
    processId: string,
    tag: string,
    description: string,
  ) {
    const process = await this.processRepository.findOne({
      where: { id: processId, userId },
    });
    if (!process) {
      throw new ProcessNotFoundException();
    }
    const currentVersionDetail = await this.processDetailModel.findOne({
      _id: `${userId}.${process.id}.${process.version}`,
    });
    if (!currentVersionDetail) {
      throw new ProcessNotFoundException();
    }
    return this.createProcessVersion(userId, {
      processId: processId,
      xml: currentVersionDetail.xml,
      variables: currentVersionDetail.variables,
      activities: currentVersionDetail.activities,
      tag: tag,
      description: description,
    });
  }

  async restoreProcessVersion(userId: number, processId: string, versionId: string) {
    try {
      const process = await this.processRepository.findOne({
        where: { id: processId },
      });

      if (!process) {
        throw new ProcessNotFoundException();
      }

      const processVersion = await this.processVersionRepository.findOne({
        where: { id: versionId },
      });

      if (!processVersion) {
        throw new ProcessNotFoundException();
      }

      const processVersionDetail = await this.processDetailModel.findOne({
        versionId: versionId,
      });

      if (!processVersionDetail) {
        throw new ProcessNotFoundException();
      }
      const newVersion: CreateProcessVersionDto = {
        processId: processId,
        xml: processVersionDetail.xml,
        variables: processVersionDetail.variables,
        activities: processVersionDetail.activities,
        tag: `${processVersion.tag}-restored`,
        description: `Restored from ${processVersion.tag}`,
      };
      return this.createProcessVersion(userId, newVersion);
    } catch (error) {
      // Giữ nguyên domain exceptions
      if (error instanceof ProcessNotFoundException) {
        throw error;
      }

      // Wrap lỗi hệ thống
      throw new InternalServerErrorException('Failed to restore process version');
    }
  }

  async getAllVersionsOfProcess(userId: number, processId: string) {
    const process = await this.processRepository.findOne({
      where: { id: processId, userId },
    });
    if (!process) {
      throw new ProcessNotFoundException();
    }
    return this.processVersionRepository
      .createQueryBuilder('processVersion')
      .leftJoinAndSelect('processVersion.creator', 'user')
      .where('processVersion.processId = :processId', { processId })
      .orderBy('processVersion.updatedAt', 'DESC')
      .getMany();
  }

  async getProcessVersionDetail(userId: number, processId: string, versionId: string) {
    try {
      const process = await this.processRepository.findOne({
        where: { id: processId, userId },
      });
      if (!process) {
        throw new ProcessNotFoundException();
      }
      const processVersion = await this.processVersionRepository.findOne({
        where: { id: versionId, processId: processId },
      });
      if (!processVersion) {
        throw new ProcessNotFoundException();
      }
      const processVersionDetail = await this.processDetailModel.findOne({
        versionId: versionId,
      });
      if (!processVersionDetail) {
        throw new ProcessNotFoundException();
      }
      return {
        processVersion,
        xml: processVersionDetail?.xml,
        variables: processVersionDetail?.variables,
        activities: processVersionDetail?.activities,
      } as ProcessDetailVersionResponse;
    } catch (error) {
      throw new ProcessNotFoundException();
    }
  }

  async deleteProcessVersion(userId: number, processId: string, versionId: string) {
    const process = await this.processRepository.findOne({
      where: { id: processId, userId },
    });
    if (!process) {
      throw new ProcessNotFoundException();
    }
    const processVersion = await this.processVersionRepository.findOne({
      where: { id: versionId, processId: processId },
    });

    if (!processVersion) {
      throw new ProcessNotFoundException();
    }
    const processVersionDetail = await this.processDetailModel.findOne({
      versionId: versionId,
    });
    try {
      if (processVersionDetail) {
        await this.processDetailModel.deleteOne({ _id: processVersionDetail._id });
      }
      return this.processVersionRepository.delete(versionId);
    } catch (error) {
      throw new UnableToDeleteProcessException();
    }
  }
}
