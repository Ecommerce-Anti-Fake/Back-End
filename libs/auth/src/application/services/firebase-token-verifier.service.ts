import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

export type VerifiedFirebaseToken = {
  uid: string;
  email?: string;
  emailVerified?: boolean;
  phoneNumber?: string;
  name?: string;
  authTime?: number;
  signInProvider?: string;
};

@Injectable()
export class FirebaseTokenVerifierService {
  constructor(private readonly configService: ConfigService) {}

  async verifyIdToken(idToken: string): Promise<VerifiedFirebaseToken> {
    try {
      this.ensureFirebaseApp();
      const decoded = await getAuth().verifyIdToken(idToken, true);

      return {
        uid: decoded.uid,
        email: decoded.email,
        emailVerified: decoded.email_verified,
        phoneNumber: decoded.phone_number,
        name: typeof decoded.name === 'string' ? decoded.name : undefined,
        authTime: decoded.auth_time,
        signInProvider:
          typeof decoded.firebase?.sign_in_provider === 'string'
            ? decoded.firebase.sign_in_provider
            : undefined,
      };
    } catch {
      throw new UnauthorizedException('Invalid Firebase token');
    }
  }

  private ensureFirebaseApp() {
    if (getApps().length > 0) {
      return;
    }

    const projectId = this.configService
      .get<string>('FIREBASE_PROJECT_ID')
      ?.trim();
    const clientEmail = this.configService
      .get<string>('FIREBASE_CLIENT_EMAIL')
      ?.trim();
    const privateKey = this.configService
      .get<string>('FIREBASE_PRIVATE_KEY')
      ?.replace(/\\n/g, '\n')
      .trim();

    if (!projectId || !clientEmail || !privateKey) {
      throw new UnauthorizedException('Firebase Admin is not configured');
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
