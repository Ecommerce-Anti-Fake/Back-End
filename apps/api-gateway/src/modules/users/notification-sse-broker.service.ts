import { Injectable, MessageEvent } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

export type NotificationInvalidationEvent = {
  family: 'notification';
  reason: 'created' | 'read' | 'read_all' | 'push_token_registered' | 'push_token_revoked';
  userId: string;
  notificationId?: string | null;
  unreadCount?: number | null;
};

@Injectable()
export class NotificationSseBrokerService {
  private readonly streams = new Map<string, Subject<MessageEvent>>();

  streamForUser(userId: string): Observable<MessageEvent> {
    return this.subjectForUser(userId).asObservable();
  }

  notifyUser(event: NotificationInvalidationEvent) {
    const subject = this.streams.get(event.userId);
    if (!subject) {
      return false;
    }

    subject.next({
      type: 'notification.invalidate',
      data: {
        family: event.family,
        reason: event.reason,
        notificationId: event.notificationId ?? null,
        unreadCount: event.unreadCount ?? null,
      },
    });

    return true;
  }

  private subjectForUser(userId: string) {
    const existing = this.streams.get(userId);
    if (existing) {
      return existing;
    }

    const subject = new Subject<MessageEvent>();
    this.streams.set(userId, subject);

    return subject;
  }
}
