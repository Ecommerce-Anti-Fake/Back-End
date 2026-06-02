import { NotFoundException } from '@nestjs/common';
import { UpdateAdminReportUseCase } from './update-admin-report.use-case';

describe('UpdateAdminReportUseCase', () => {
  const ordersRepository = {
    findReportById: jest.fn(),
    updateReportStatus: jest.fn(),
    upsertReportModerationCase: jest.fn(),
    createAuditLog: jest.fn(),
    updateSocialReportTargetVisibility: jest.fn(),
  };
  const recalculateRiskTargetsUseCase = {
    executeForReport: jest.fn(),
  };
  const useCase = new UpdateAdminReportUseCase(ordersRepository as never, recalculateRiskTargetsUseCase as never);

  beforeEach(() => {
    jest.resetAllMocks();
    ordersRepository.findReportById.mockResolvedValue(reportRecord());
    ordersRepository.updateReportStatus.mockResolvedValue(reportRecord({ reportStatus: 'RESOLVED' }));
  });

  it('hides reported social content when the report is resolved', async () => {
    await useCase.execute({
      reportId: 'report-1',
      requesterUserId: 'admin-user-1',
      reportStatus: 'RESOLVED',
      internalNote: 'An noi dung spam',
    });

    expect(ordersRepository.updateSocialReportTargetVisibility).toHaveBeenCalledWith({
      targetType: 'SOCIAL_POST',
      targetId: 'post-1',
      visibility: 'HIDDEN',
      actorUserId: 'admin-user-1',
    });
    expect(ordersRepository.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        targetType: 'SOCIAL_POST',
        targetId: 'post-1',
        action: 'SOCIAL_CONTENT_VISIBILITY_CHANGED',
        toStatus: 'HIDDEN',
      }),
    );
  });

  it('restores reported social content when the report is rejected', async () => {
    await useCase.execute({
      reportId: 'report-1',
      requesterUserId: 'admin-user-1',
      reportStatus: 'REJECTED',
    });

    expect(ordersRepository.updateSocialReportTargetVisibility).toHaveBeenCalledWith(
      expect.objectContaining({
        visibility: 'PUBLIC',
      }),
    );
  });

  it('fails when report does not exist', async () => {
    ordersRepository.findReportById.mockResolvedValueOnce(null);

    await expect(
      useCase.execute({
        reportId: 'missing',
        requesterUserId: 'admin-user-1',
        reportStatus: 'RESOLVED',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

function reportRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'report-1',
    reporterUserId: 'buyer-user-1',
    targetType: 'SOCIAL_POST',
    targetId: 'post-1',
    reason: 'Spam hang gia',
    reportStatus: 'OPEN',
    createdAt: new Date('2026-06-02T10:00:00.000Z'),
    reporter: {
      id: 'buyer-user-1',
      displayName: 'Buyer',
      email: 'buyer@example.com',
    },
    ...overrides,
  };
}
