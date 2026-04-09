import admin from '../../../utils/firebaseAdmin';

const UserConnection = require('../../../models/UserConnection');
import { decrypt } from '@servx/crypto';
const { logNewUserToSheet } = require('../../../services/sheetsService');
import { sendServXAlertService } from '../../core/services/emailService';

export interface NewUserLogParams {
  uid: string;
  email: string;
  role?: string;
}

export async function logNewUserToSheetService(params: NewUserLogParams): Promise<void> {
  await logNewUserToSheet(params);
}

export async function sendServXAlert(
  to: string,
  subject: string,
  htmlBody: string
): Promise<void> {
  await sendServXAlertService(to, subject, htmlBody);
}

export async function getFirebaseApp(connectionId?: string | null): Promise<any> {
  if (connectionId) {
    const appName = `fb_${connectionId}`;
    const existing = admin.apps.find((app: any) => app && app.name === appName);
    if (existing) {
      return existing;
    }

    const connection = await UserConnection.findById(connectionId);
    if (!connection || connection.provider !== 'Firebase') {
      throw new Error('Firebase connection not found');
    }

    const decrypted = decrypt({ content: connection.encryptedConfig, iv: connection.iv });
    const config = JSON.parse(decrypted) as { serviceAccountJson?: string };
    if (!config.serviceAccountJson) {
      throw new Error('Firebase service account JSON is missing');
    }

    const serviceAccount = JSON.parse(config.serviceAccountJson) as {
      project_id: string;
      client_email: string;
      private_key: string;
    };

    return admin.initializeApp(
      {
        credential: admin.credential.cert(serviceAccount as any),
        projectId: serviceAccount.project_id,
      },
      appName
    );
  }

  return admin.app();
}

export async function findFirebaseConnectionId(): Promise<string | null> {
  const connection = await UserConnection.findOne({ provider: 'Firebase' });
  return connection ? connection._id.toString() : null;
}
