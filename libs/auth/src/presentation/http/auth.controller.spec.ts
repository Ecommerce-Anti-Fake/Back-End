import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard, RolesGuard } from '@security';
import { PrismaService } from '@database/prisma/prisma.service';
import { AuthUserResponseDto } from '../../application/dto/auth-response.dto';
import { LoginUseCase } from '../../application/use-cases/login.use-case';
import { LogoutUseCase } from '../../application/use-cases/logout.use-case';
import { RefreshTokenUseCase } from '../../application/use-cases/refresh-token.use-case';
import { RegisterUseCase } from '../../application/use-cases/register.use-case';
import { AuthController } from './auth.controller';

describe('AuthController', () => {
  let controller: AuthController;

  const registerUseCaseMock = {
    execute: jest.fn(),
  };

  const loginUseCaseMock = {
    execute: jest.fn(),
  };

  const refreshTokenUseCaseMock = {
    execute: jest.fn(),
  };

  const logoutUseCaseMock = {
    execute: jest.fn(),
  };

  const jwtAuthGuardMock = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  const rolesGuardMock = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  const jwtServiceMock = {
    verifyAsync: jest.fn(),
  };

  const prismaServiceMock = {
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: RegisterUseCase, useValue: registerUseCaseMock },
        { provide: LoginUseCase, useValue: loginUseCaseMock },
        { provide: RefreshTokenUseCase, useValue: refreshTokenUseCaseMock },
        { provide: LogoutUseCase, useValue: logoutUseCaseMock },
        { provide: JwtAuthGuard, useValue: jwtAuthGuardMock },
        { provide: RolesGuard, useValue: rolesGuardMock },
        { provide: JwtService, useValue: jwtServiceMock },
        { provide: PrismaService, useValue: prismaServiceMock },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('register should delegate to RegisterUseCase', async () => {
    const dto = { email: 'user@example.com', password: '12345678' };
    registerUseCaseMock.execute.mockResolvedValueOnce({ id: 'user-1' });

    await expect(controller.register(dto)).resolves.toEqual({ id: 'user-1' });
    expect(registerUseCaseMock.execute).toHaveBeenCalledWith(dto);
  });

  it('login should delegate to LoginUseCase', async () => {
    const dto = { username: 'user@example.com', password: '12345678' };
    loginUseCaseMock.execute.mockResolvedValueOnce({ accessToken: 'token' });

    await expect(controller.login(dto)).resolves.toEqual({ accessToken: 'token' });
    expect(loginUseCaseMock.execute).toHaveBeenCalledWith(dto);
  });

  it('refresh should delegate to RefreshTokenUseCase', async () => {
    const dto = { refreshToken: 'refresh-token' };
    refreshTokenUseCaseMock.execute.mockResolvedValueOnce({ accessToken: 'new-token' });

    await expect(controller.refresh(dto)).resolves.toEqual({ accessToken: 'new-token' });
    expect(refreshTokenUseCaseMock.execute).toHaveBeenCalledWith(dto);
  });

  it('logout should delegate to LogoutUseCase', async () => {
    const dto = { refreshToken: 'refresh-token' };
    logoutUseCaseMock.execute.mockResolvedValueOnce({ loggedOut: true });

    await expect(controller.logout(dto)).resolves.toEqual({ loggedOut: true });
    expect(logoutUseCaseMock.execute).toHaveBeenCalledWith(dto);
  });

  it('adminCheck should return admin confirmation payload', async () => {
    const user: AuthUserResponseDto = {
      id: 'admin-1',
      email: 'admin@example.com',
      phone: null,
      displayName: 'Admin',
      role: 'admin',
      accountStatus: 'active',
    };

    await expect(controller.adminCheck({ user })).resolves.toEqual({
      message: 'Admin access granted',
      user,
    });
  });
});
