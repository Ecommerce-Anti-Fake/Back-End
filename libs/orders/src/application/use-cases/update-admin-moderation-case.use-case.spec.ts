import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { UpdateAdminModerationCaseUseCase } from './update-admin-moderation-case.use-case';

describe('UpdateAdminModerationCaseUseCase', () => {
  let useCase: UpdateAdminModerationCaseUseCase;

  const ordersRepositoryMock = {
    findModerationCaseById: jest.fn(),
    updateModerationCase: jest.fn(),
    createAuditLog: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateAdminModerationCaseUseCase,
        { provide: OrdersRepository, useValue: ordersRepositoryMock },
      ],
    }).compile();

    useCase = module.get<UpdateAdminModerationCaseUseCase>(UpdateAdminModerationCaseUseCase);
  });

  it('updates case status and writes audit trail', async () => {
    const existingCase = {
      id: 'case-1',
      targetType: 'OFFER',
      targetId: 'offer-1',
      reason: 'Risk score HIGH (64)',
      caseStatus: 'IN_REVIEW',
      internalNote: 'Old note',
      assignedAdminUserId: null,
      assignedAdmin: null,
      createdAt: new Date('2026-05-21T10:00:00.000Z'),
      resolvedAt: null,
    };
    const updatedCase = {
      ...existingCase,
      caseStatus: 'RESOLVED',
      internalNote: 'Da xac minh hang that.',
      assignedAdminUserId: 'admin-2',
      assignedAdmin: {
        id: 'admin-2',
        displayName: 'Admin Two',
        email: 'admin2@example.com',
      },
      resolvedAt: new Date('2026-05-21T11:00:00.000Z'),
    };
    ordersRepositoryMock.findModerationCaseById.mockResolvedValueOnce(existingCase);
    ordersRepositoryMock.updateModerationCase.mockResolvedValueOnce(updatedCase);

    const result = await useCase.execute({
      caseId: 'case-1',
      requesterUserId: 'admin-1',
      caseStatus: 'RESOLVED',
      assignedAdminUserId: 'admin-2',
      internalNote: 'Da xac minh hang that.',
    });

    expect(ordersRepositoryMock.updateModerationCase).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'case-1',
        caseStatus: 'RESOLVED',
        assignedAdminUserId: 'admin-2',
        internalNote: 'Da xac minh hang that.',
        resolvedAt: expect.any(Date),
      }),
    );
    expect(ordersRepositoryMock.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        targetType: 'OFFER',
        targetId: 'offer-1',
        actorUserId: 'admin-1',
        action: 'MODERATION_CASE_UPDATED',
        fromStatus: 'IN_REVIEW',
        toStatus: 'RESOLVED',
      }),
    );
    expect(result).toMatchObject({
      id: 'case-1',
      caseStatus: 'RESOLVED',
      assignedAdminDisplayName: 'Admin Two',
    });
  });

  it('fails when moderation case does not exist', async () => {
    ordersRepositoryMock.findModerationCaseById.mockResolvedValueOnce(null);

    await expect(
      useCase.execute({
        caseId: 'missing-case',
        requesterUserId: 'admin-1',
        caseStatus: 'IN_REVIEW',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(ordersRepositoryMock.updateModerationCase).not.toHaveBeenCalled();
  });
});
