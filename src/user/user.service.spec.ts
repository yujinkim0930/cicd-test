import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

describe('UserService', () => {
  let userService: UserService;
  let userRepositoryMock: Partial<Record<keyof Repository<User>, jest.Mock>>;
  let jwtServiceMock: Partial<JwtService>;

  beforeEach(async () => {
    userRepositoryMock = {
      save: jest.fn(),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      update: jest.fn(),
    };

    jwtServiceMock = {
      sign: jest.fn().mockReturnValue('test_jwt_token'),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepositoryMock,
        },
        {
          provide: JwtService,
          useValue: jwtServiceMock,
        },
      ],
    }).compile();

    userService = moduleRef.get<UserService>(UserService);
  });

  it('should register a new user with hashed password', async () => {
    const email = 'test@example.com';
    const password = 'password123';
    userRepositoryMock.findOneBy.mockResolvedValue(undefined); // 가정: 사용자가 없음
    await userService.register(email, password);
    expect(userRepositoryMock.save).toHaveBeenCalledWith(
      expect.objectContaining({
        email,
        password: expect.any(String), // 해시된 비밀번호를 검사하는 방법은 복잡하므로 여기서는 단순히 문자열인지 확인
      }),
    );
  });

  it('should throw ConflictException if user already exists', async () => {
    const email = 'test@example.com';
    const password = 'password123';
    userRepositoryMock.findOneBy.mockResolvedValue(new User()); // 가정: 사용자가 이미 있음
    await expect(userService.register(email, password)).rejects.toThrow();
  });

  it('should login a user and return a JWT token', async () => {
    const email = 'test@example.com';
    const password = 'password123';
    userRepositoryMock.findOne.mockResolvedValue({
      id: 1,
      email,
      password: await bcrypt.hash(password, 10), // 실제 해시 함수를 사용해 테스트
    });
    const result = await userService.login(email, password);
    expect(result).toHaveProperty('access_token', 'test_jwt_token');
  });

  it('should throw UnauthorizedException if login details are incorrect', async () => {
    const email = 'wrong@example.com';
    const password = 'wrongPassword';
    userRepositoryMock.findOne.mockResolvedValue(undefined); // 가정: 사용자가 없음
    await expect(userService.login(email, password)).rejects.toThrow();
  });
  it('should find a user by email', async () => {
    const email = 'test@example.com';
    const mockUser = { id: 1, email, password: 'hashedPassword' }; // 예상되는 반환 객체
    userRepositoryMock.findOneBy.mockResolvedValue(mockUser);
    const result = await userService.findByEmail(email);
    expect(result).toEqual(mockUser);
    expect(userRepositoryMock.findOneBy).toHaveBeenCalledWith({ email });
  });

  // toggleRole 메서드 테스트
  it('should toggle a user role from User to Admin', async () => {
    const mockUser = { id: 1, email: 'test@example.com', role: '0' };
    userRepositoryMock.update.mockResolvedValue({ affected: 1 }); // 성공적으로 업데이트된 경우
    const updatedRole = await userService.toggleRole(mockUser as User);
    expect(updatedRole).toEqual('1');
    expect(userRepositoryMock.update).toHaveBeenCalledWith(
      { id: mockUser.id },
      { role: '1' },
    );
  });

  it('should toggle a user role from Admin to User', async () => {
    const mockUser = { id: 1, email: 'admin@example.com', role: '1' };
    userRepositoryMock.update.mockResolvedValue({ affected: 0 }); // 성공적으로 업데이트된 경우
    const updatedRole = await userService.toggleRole(mockUser as User);
    expect(updatedRole).toEqual('0');
    expect(userRepositoryMock.update).toHaveBeenCalledWith(
      { id: mockUser.id },
      { role: '0' },
    );
  });

  // 예외 케이스 테스트
  it('should handle exceptions when toggling role fails', async () => {
    const mockUser = { id: 1, email: 'test@example.com', role: '0' };
    userRepositoryMock.update.mockRejectedValue(new Error('Database error')); // DB 업데이트 실패 가정
    await expect(userService.toggleRole(mockUser as User)).rejects.toThrow(
      'Database error',
    );
  });
});
