import { decrypt } from '@servx/crypto';
import { supabaseAdmin } from '../../utils/supabaseAdmin';
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

export async function findFirebaseConnectionId(): Promise<string | null> {
  const { data: connection } = await supabaseAdmin
    .from('db_vault')
    .select('id')
    .eq('provider', 'Firebase')
    .limit(1)
    .single();

  return connection ? connection.id : null;
}
