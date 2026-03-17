import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User, AuthenticationProvider } from './entity/user.entity';
import { ConfigService } from '@nestjs/config';
import { EmailAlreadyExistsException, FileTooLargeException } from 'src/common/exceptions';

jest.mock('@aws-sdk/client-s3');

describe('UsersService', () => {
  let service: UsersService;
  let mockUsersRepository: any;
  let mockConfigService: any;

  beforeEach(async () => {
    mockUsersRepository = {
      findOneBy: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          AWS_REGION_EXTRA: 'us-east-1',
          AWS_KEY_ID: 'test-key',
          AWS_SECRET_KEY: 'test-secret',
          AWS_S3_ROBOT_BUCKET_NAME: 'test-bucket',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUsersRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOneByEmail', () => {
    it('should return a user if found', async () => {
      const user = { id: 1, email: 'test@example.com' };
      mockUsersRepository.findOneBy.mockResolvedValue(user);
      const result = await service.findOneByEmail('test@example.com');
      expect(result).toEqual(user);
      expect(mockUsersRepository.findOneBy).toHaveBeenCalledWith({ email: 'test@example.com' });
    });

    it('should return null if user not found', async () => {
      mockUsersRepository.findOneBy.mockResolvedValue(null);
      const result = await service.findOneByEmail('notfound@example.com');
      expect(result).toBeNull();
    });

    it('should exclude specified keys', async () => {
      const user = { id: 1, email: 'test@example.com', hashedPassword: 'pwd' };
      mockUsersRepository.findOneBy.mockResolvedValue(user);
      const result = await service.findOneByEmail('test@example.com', { exclude: ['hashedPassword'] as any });
      expect(result).toEqual({ id: 1, email: 'test@example.com' });
    });
  });

  describe('create', () => {
    it('should successfully save and return a user', async () => {
      const userCreate = { name: 'Test', email: 'test@example.com', hashedPassword: 'pwd' };
      mockUsersRepository.save.mockResolvedValue({ id: 1, ...userCreate });
      
      const result = await service.create(userCreate);
      expect(result).toEqual({ id: 1, ...userCreate });
      expect(mockUsersRepository.save).toHaveBeenCalledWith(userCreate);
    });
  });

  describe('findOrCreateGoogleUser', () => {
    const googleUser = {
      id: 'google123',
      displayName: 'Google User',
      emails: [{ value: 'google@example.com' }],
      photos: [{ value: 'photo.jpg' }],
    };

    it('should return existing google user', async () => {
      const user = { id: 1, email: 'google@example.com', provider: AuthenticationProvider.GOOGLE };
      mockUsersRepository.findOneBy.mockResolvedValue(user);
      
      const result = await service.findOrCreateGoogleUser(googleUser);
      expect(result).toEqual(user);
    });

    it('should throw error if email exists but provider is not google', async () => {
      const user = { id: 1, email: 'google@example.com', provider: AuthenticationProvider.LOCAL };
      mockUsersRepository.findOneBy.mockResolvedValue(user);
      
      await expect(service.findOrCreateGoogleUser(googleUser)).rejects.toThrow(EmailAlreadyExistsException);
    });

    it('should create new user if not exists', async () => {
      mockUsersRepository.findOneBy.mockResolvedValue(null);
      const newUser = { id: 1, email: 'google@example.com', provider: AuthenticationProvider.GOOGLE };
      mockUsersRepository.save.mockResolvedValue(newUser);
      
      const result = await service.findOrCreateGoogleUser(googleUser);
      expect(result).toEqual(newUser);
      expect(mockUsersRepository.save).toHaveBeenCalledWith({
        name: 'Google User',
        email: 'google@example.com',
        avatarUrl: 'photo.jpg',
        provider: AuthenticationProvider.GOOGLE,
        providerId: 'google123',
      });
    });
  });

  describe('updateProfile', () => {
    it('should update and return user', async () => {
      const user = { id: 1, name: 'Old Name' };
      mockUsersRepository.findOne.mockResolvedValue(user);
      mockUsersRepository.save.mockResolvedValue({ ...user, name: 'New Name' });
      
      const result = await service.updateProfile(1, { name: 'New Name', language: undefined } as any);
      expect(result?.name).toEqual('New Name');
    });

    it('should return null if user not found', async () => {
      mockUsersRepository.findOne.mockResolvedValue(null);
      const result = await service.updateProfile(1, { name: 'New Name' } as any);
      expect(result).toBeNull();
    });
  });

  describe('uploadAvatar', () => {
    it('should return null if user not found', async () => {
      mockUsersRepository.findOne.mockResolvedValue(null);
      const file = { size: 100, originalname: 'test.jpg' } as any;
      const result = await service.uploadAvatar(1, file);
      expect(result).toBeNull();
    });

    it('should throw FileTooLargeException if file exceeds size limit', async () => {
      const user = { id: 1 };
      mockUsersRepository.findOne.mockResolvedValue(user);
      const file = { size: 20 * 1024 * 1024, originalname: 'test.jpg' } as any; // 20MB
      
      await expect(service.uploadAvatar(1, file)).rejects.toThrow(FileTooLargeException);
    });

    it('should upload avatar successfully', async () => {
      const user = { id: 1, avatarUrl: '' };
      mockUsersRepository.findOne.mockResolvedValue(user);
      mockUsersRepository.save.mockResolvedValue({ ...user, avatarUrl: 'test-url' });
      const file = { size: 100, originalname: 'test.jpg', buffer: Buffer.from('test'), mimetype: 'image/jpeg' } as any;
      
      const result = await service.uploadAvatar(1, file);
      expect(mockUsersRepository.save).toHaveBeenCalled();
    });
  });
});
