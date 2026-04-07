import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;

  const authServiceMock = {
    register: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authServiceMock }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('register should delegate to AuthService', async () => {
    const dto = { email: 'user@example.com', password: '12345678' };
    authServiceMock.register.mockResolvedValueOnce({ id: 'user-1' });

    await expect(controller.register(dto)).resolves.toEqual({ id: 'user-1' });
    expect(authServiceMock.register).toHaveBeenCalledWith(dto);
  });

  it('login should delegate to AuthService', async () => {
    const dto = { username: 'user@example.com', password: '12345678' };
    authServiceMock.login.mockResolvedValueOnce({ accessToken: 'token' });

    await expect(controller.login(dto)).resolves.toEqual({ accessToken: 'token' });
    expect(authServiceMock.login).toHaveBeenCalledWith(dto);
  });

  it('refresh should delegate to AuthService', async () => {
    const dto = { refreshToken: 'refresh-token' };
    authServiceMock.refresh.mockResolvedValueOnce({ accessToken: 'new-token' });

    await expect(controller.refresh(dto)).resolves.toEqual({ accessToken: 'new-token' });
    expect(authServiceMock.refresh).toHaveBeenCalledWith(dto);
  });

  it('logout should delegate to AuthService', async () => {
    const dto = { refreshToken: 'refresh-token' };
    authServiceMock.logout.mockResolvedValueOnce({ loggedOut: true });

    await expect(controller.logout(dto)).resolves.toEqual({ loggedOut: true });
    expect(authServiceMock.logout).toHaveBeenCalledWith(dto);
  });
});
