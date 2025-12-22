import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  UnableToCreateConnectionException,
  ConnectionNotFoundException,
  CannotRefreshToken,
} from 'src/common/exceptions';
import { Connection, AuthorizationProvider, RobotConnection } from 'src/connection/entity/';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { GoogleService } from 'src/google/google.service';
import crypto from 'crypto';
import { Robot } from 'src/robot/entity/robot.entity';
import { GoogleCredentialService } from './service/google-credential.service';
import { MoodleService } from './service/moodle.service';
import { CreateMoodleConnectionDto } from './dto/create-moodle-connection.dto';
import { connect } from 'http2';
import { WhereClause } from 'typeorm/query-builder/WhereClause';
import { CreateRobotProvider } from 'src/robot/dto/create-robot-v2.dto';

export interface UserTokenFromProvider {
  accessToken: string;
  refreshToken: string;
  profile: any;
}

export interface CreateConnectionDto {
  provider: AuthorizationProvider;
  fromUser: number;
  accessToken: string;
  refreshToken: string;
  email?: string;
}

@Injectable()
export class ConnectionService {
  constructor(
    @InjectRepository(Connection)
    private connectionRepository: Repository<Connection>,
    @InjectRepository(RobotConnection)
    private robotConnectionRepository: Repository<RobotConnection>,
    @InjectRepository(Robot)
    private robotRepository: Repository<Robot>,
    readonly configService: ConfigService,
    private googleService: GoogleService,
    private googleCredentialService: GoogleCredentialService,
    private moodleService: MoodleService,
  ) {}

  async createConnection(
    createConnectionDto: CreateConnectionDto,
    options?: { reconnect?: boolean },
  ) {
    if (!options.reconnect) {
      await this.checkIfAbleToCreateConnection(createConnectionDto);

      const connection = await this.connectionRepository.save({
        provider: createConnectionDto.provider,
        userId: createConnectionDto.fromUser,
        name: createConnectionDto.email ? createConnectionDto.email : Date.now().toString(),
        accessToken: createConnectionDto.accessToken,
        refreshToken: createConnectionDto.refreshToken,
      });
      return connection;
    } else {
      const connection = await this.connectionRepository.findOneBy({
        provider: createConnectionDto.provider,
        userId: createConnectionDto.fromUser,
        name: createConnectionDto.email,
      });

      if (!connection) {
        throw new ConnectionNotFoundException();
      }

      connection.accessToken = createConnectionDto.accessToken;
      connection.refreshToken = createConnectionDto.refreshToken;
      await this.connectionRepository.save(connection);
      return connection;
    }
  }

  async getConnections(userId: number, provider?: AuthorizationProvider) {
    let whereString = 'connection.userId = :userId';
    if (provider) {
      whereString += ' AND connection.provider = :provider';
    }
    return this.connectionRepository
      .createQueryBuilder('connection')
      .select([
        'connection.provider',
        'connection.name',
        'connection.createdAt',
        'connection.connectionKey',
      ])
      .where(whereString, { userId, provider })
      .getMany();
  }

  async getConnection(
    userId: number,
    query: {
      provider: AuthorizationProvider;
      name: string;
    },
  ) {
    const connection = await this.connectionRepository.findOneBy({
      userId,
      provider: AuthorizationProvider[query.provider],
      name: query.name,
    });
    return connection;
  }

  private async checkIfAbleToCreateConnection(createConnectionDto: CreateConnectionDto) {
    if (!createConnectionDto.email) return;

    const existingConnection = await this.connectionRepository.findOneBy({
      provider: createConnectionDto.provider,
      userId: createConnectionDto.fromUser,
      name: createConnectionDto.email,
    });

    if (existingConnection) {
      throw new UnableToCreateConnectionException();
    }
  }

  async refreshToken(userId: number, provider: AuthorizationProvider, name: string) {
    const connection = await this.connectionRepository.findOneBy({
      userId,
      provider,
      name,
    });

    if (!connection) {
      throw new ConnectionNotFoundException();
    }

    const oauth2Client = this.googleService.getOAuth2Client(provider);
    oauth2Client.setCredentials({
      access_token: connection.accessToken,
      refresh_token: connection.refreshToken,
    });

    try {
      const res = await oauth2Client.refreshAccessToken();
      return 'Refresh token sucessfully';
    } catch {
      throw new CannotRefreshToken();
    }
  }

  async removeConnection(userId: number, provider: AuthorizationProvider, name: string) {
    const connection = await this.connectionRepository.findOneBy({
      userId,
      provider,
      name,
    });

    if (!connection) {
      throw new ConnectionNotFoundException();
    }

    await this.revokeToken(connection.refreshToken);
    await this.connectionRepository.delete({
      userId,
      provider,
      name,
    });
  }

  private async revokeToken(refreshToken: string) {
    const url = `https://oauth2.googleapis.com/revoke?token=${refreshToken}`;

    const res = await axios.post(url, null, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    return res;
  }

  async getConnectionByProviders(userId: number, providers: AuthorizationProvider[]) {
    // Use TypeORM's query builder to build a query
    const query = this.connectionRepository
      .createQueryBuilder('connection')
      .where('connection.userId = :userId', { userId })
      .andWhere('connection.provider IN (:...providers)', { providers });

    // Execute the query and return the result
    return query.getMany();
  }

  async updateconnectionAccessToken(
    userId: number,
    accessToken: string,
    provider: AuthorizationProvider,
  ) {
    const connection = await this.connectionRepository.findOneBy({
      userId,
      provider,
    });

    if (!connection) {
      console.log('Connection not found');
      return false;
    }

    connection.accessToken = accessToken;

    await this.connectionRepository.save(connection);
    return true;
  }

  async addRobotConnection(userId: number, robotKey: string, providers: CreateRobotProvider[]) {
    return this.robotConnectionRepository.save(
      providers.map((c) => ({
        robotKey: robotKey,
        connectionKey: c.connectionKey,
      })),
    );
  }

  async getRobotConnection(userId: number, processId: string, processVersion: number) {
    let robot = await this.robotRepository.findOne({
      where: {
        userId: userId,
        processId: processId,
        processVersion: processVersion,
      },
    });
    let robotKey = robot.robotKey;
    let robotConnectionsMapping = await this.robotConnectionRepository.find({
      select: [],
      where: {
        robotKey: robotKey,
      },
      relations: ['connection'],
    });
    let connections = robotConnectionsMapping.map((conn) => ({
      fileName: ConnectionService.getCredentialFileName(conn.connectionKey),
      data: this.googleCredentialService.create(conn.connection),
    }));
    return connections;
  }

  checkValidCreentials(providers: AuthorizationProvider[], credentials: Connection[]) {
    if (credentials.length != providers.length) {
      let credentialProviders = credentials.map((c: { provider: any }) => c.provider);
      let misMatchProvider = providers.filter((p: any) => !credentialProviders.includes(p));
      throw new BadRequestException('Something bad happened', {
        cause: new Error(),
        description: `Missing credentials for: ${JSON.stringify(misMatchProvider)}`,
      });
    }
  }

  async getRobotConnectionsForUser(
    userId: number,
    processId: string,
    processVersion: number,
    limit: number = 0,
    offset: number = 10,
  ) {
    let robot = await this.robotRepository.findOne({
      where: {
        userId: userId,
        processId: processId,
        processVersion: processVersion,
      },
    });
    let robotKey = robot.robotKey;
    let robotConnectionsMapping = await this.robotConnectionRepository.find({
      select: [],
      where: {
        robotKey: robotKey,
      },
      relations: ['connection'],
      skip: limit,
      take: offset,
    });
    return robotConnectionsMapping.map((conn) => conn.connection);
  }

  async getRobotsByConnection(connectionKey: string, limit: number = 0, offset: number = 0) {
    let result = await this.robotConnectionRepository.find({
      where: {
        connectionKey: connectionKey,
      },
      relations: ['robot'],
      skip: limit,
      take: offset,
    });
    return result.map((c) => c.robot);
  }

  static getCredentialFileName(connectionKey: string) {
    return `${connectionKey}.json`;
  }

  async getAllConnectionsByRobotKey(robotKey: string, limit: number = 0, offset: number = 0) {
    const robotConnections = await this.robotConnectionRepository.find({
      select: ['isActivate'],
      relations: ['connection'],
      where: {
        robotKey: robotKey,
      },
      skip: offset,
      take: limit,
    });

    return robotConnections.map(({ isActivate, connection }) => ({
      isActivate: isActivate,
      connectionKey: connection.connectionKey,
      provider: connection.provider,
      name: connection.name,
      createdAt: connection.createdAt,
      userId: connection.userId,
    }));
  }

  async getConnectionByConnectionKey(connectionKeys: string[]) {
    if (!connectionKeys.length) {
      return {
        connections: [],
      };
    }
    // Use TypeORM's query builder to build a query
    const query = this.connectionRepository
      .createQueryBuilder('connection')
      .where('connection.connectionKey IN (:...connectionKeys)', { connectionKeys });

    // Execute the query and return the result
    const result = await query.getMany();
    return {
      connections: result,
    };
  }

  async toggleRobotActivation(robotKey: string, connectionKey: string, status: boolean) {
    const robotConnection = await this.robotConnectionRepository.findOne({
      where: {
        robotKey: robotKey,
        connectionKey: connectionKey,
      },
    });
    robotConnection.isActivate = status;
    await this.robotConnectionRepository.save(robotConnection);
  }

  /**
   * Create Moodle connection
   * Moodle uses token-based authentication, not OAuth2
   */
  async createMoodleConnection(
    userId: number,
    createMoodleDto: CreateMoodleConnectionDto,
  ): Promise<Connection> {
    // Verify Moodle connection
    const isValid = await this.moodleService.verifyConnection({
      baseUrl: createMoodleDto.baseUrl,
      token: createMoodleDto.token,
    });

    if (!isValid) {
      throw new BadRequestException('Invalid Moodle credentials or connection failed');
    }

    // Get site info to use as connection name if not provided
    let connectionName = createMoodleDto.name;
    if (!connectionName) {
      try {
        const siteInfo = await this.moodleService.getSiteInfo({
          baseUrl: createMoodleDto.baseUrl,
          token: createMoodleDto.token,
        });
        connectionName = siteInfo.sitename || createMoodleDto.baseUrl;
      } catch (error) {
        connectionName = createMoodleDto.baseUrl;
      }
    }

    // Check if connection already exists
    const existingConnection = await this.connectionRepository.findOneBy({
      provider: AuthorizationProvider.MOODLE,
      userId,
      name: connectionName,
    });

    if (existingConnection) {
      throw new UnableToCreateConnectionException();
    }

    // Store Moodle credentials
    // For Moodle, we store baseUrl in accessToken and token in refreshToken
    const connection = await this.connectionRepository.save({
      provider: AuthorizationProvider.MOODLE,
      userId,
      name: connectionName,
      accessToken: createMoodleDto.baseUrl,
      refreshToken: createMoodleDto.token,
    });

    return connection;
  }

  /**
   * Get Moodle connection credentials
   */
  async getMoodleCredentials(
    userId: number,
    connectionName: string,
  ): Promise<{ baseUrl: string; token: string }> {
    const connection = await this.connectionRepository.findOneBy({
      userId,
      provider: AuthorizationProvider.MOODLE,
      name: connectionName,
    });

    if (!connection) {
      throw new ConnectionNotFoundException();
    }

    return {
      baseUrl: connection.accessToken,
      token: connection.refreshToken,
    };
  }

  /**
   * Test Moodle connection
   */
  async testMoodleConnection(userId: number, connectionName: string): Promise<any> {
    const credentials = await this.getMoodleCredentials(userId, connectionName);
    return this.moodleService.getSiteInfo(credentials);
  }
}
