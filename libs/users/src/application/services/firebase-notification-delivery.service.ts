import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

export type FirebaseNotificationDeliveryInput = {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
};

export type FirebaseNotificationDeliveryResult = {
  token: string;
  status: 'SENT' | 'FAILED';
  errorCode?: string | null;
  errorMessage?: string | null;
};

@Injectable()
export class FirebaseNotificationDeliveryService {
  constructor(private readonly configService: ConfigService) {}

  async sendToTokens(input: FirebaseNotificationDeliveryInput): Promise<FirebaseNotificationDeliveryResult[]> {
    const tokens = Array.from(new Set(input.tokens.filter(Boolean)));
    if (tokens.length === 0) {
      return [];
    }

    try {
      this.ensureFirebaseApp();
      const response = await getMessaging().sendEachForMulticast({
        tokens,
        notification: {
          title: input.title,
          body: input.body,
        },
        data: input.data ?? {},
      });

      return response.responses.map((item, index) => ({
        token: tokens[index],
        status: item.success ? 'SENT' : 'FAILED',
        errorCode: item.error?.code ?? null,
        errorMessage: item.error?.message ?? null,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'FCM delivery failed';

      return tokens.map((token) => ({
        token,
        status: 'FAILED',
        errorCode: 'FCM_UNAVAILABLE',
        errorMessage: message,
      }));
    }
  }

  private ensureFirebaseApp() {
    if (getApps().length > 0) {
      return;
    }

    const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID')?.trim();
    const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL')?.trim();
    const privateKey = this.configService
      .get<string>('FIREBASE_PRIVATE_KEY')
      ?.replace(/\\n/g, '\n')
      .trim();

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error('Firebase Admin is not configured');
    }

    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }
}
