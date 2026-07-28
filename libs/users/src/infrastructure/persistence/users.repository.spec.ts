import { Prisma } from '@prisma/client';
import { UsersRepository } from './users.repository';

describe('UsersRepository notification idempotency', () => {
  it('claims a duplicate dedupe key without creating a second notification', async () => {
    const existing = {
      id: 'notification-1',
      dedupeKey: 'live-started:live-1:user-1',
    };
    const prisma = {
      notification: {
        create: jest.fn().mockRejectedValue(
          new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
            code: 'P2002',
            clientVersion: '7.6.0',
          }),
        ),
        update: jest.fn().mockResolvedValue(existing),
      },
    };
    const repository = new UsersRepository(prisma as never);

    await expect(
      repository.createNotification({
        userId: 'user-1',
        notificationType: 'LIVE_STARTED',
        title: 'Livestream da bat dau',
        body: 'Dang phat truc tiep.',
        targetType: 'LIVE_SESSION',
        targetId: 'live-1',
        dedupeKey: 'live-started:live-1:user-1',
      }),
    ).resolves.toEqual({
      notification: existing,
      createdNow: false,
    });
    expect(prisma.notification.update).toHaveBeenCalledWith({
      where: { dedupeKey: 'live-started:live-1:user-1' },
      data: {
        title: 'Livestream da bat dau',
        body: 'Dang phat truc tiep.',
        targetType: 'LIVE_SESSION',
        targetId: 'live-1',
      },
    });
  });
});
