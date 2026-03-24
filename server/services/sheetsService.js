/**
 * New User Logging Pipeline - Google Sheets Service
 * ================================================
 *
 * LOCAL: Uses ServX.json in project root (service account credentials).
 * DEPLOYMENT (Render): Uses GOOGLE_SHEETS_* env vars; set GOOGLE_SHEETS_PRIVATE_KEY
 *   with full private_key (use \n for newlines in Render env).
 *
 * SHARE THE SHEET: Add client_email (e.g. servx-822@servx-490403.iam.gserviceaccount.com)
 *   as Editor in Google Sheets.
 */

const path = require('path');
const fs = require('fs');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

function getServiceAccountCredentials() {
  const servxPath = path.join(__dirname, '..', '..', 'ServX.json');
  if (fs.existsSync(servxPath)) {
    const cred = require(servxPath);
    return { email: cred.client_email, key: cred.private_key };
  }
  const envKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;
  const envEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  if (envKey && envEmail) {
    return {
      email: envEmail,
      key: envKey.replace(/\\n/g, '\n'),
    };
  }
  return null;
}

const CREDENTIALS = getServiceAccountCredentials();

const HEADERS = ['Date Joined', 'Firebase UID', 'Email', 'Role'];

/**
 * Logs a new user to the first sheet of the configured Google Spreadsheet.
 * @param {Object} userData
 * @param {string} userData.uid - Firebase UID
 * @param {string} userData.email - User email
 * @param {string} [userData.role='user'] - User role
 * @returns {Promise<void>}
 */
async function logNewUserToSheet(userData) {
  if (!SPREADSHEET_ID || !CREDENTIALS) {
    console.warn('[Sheets] Skipping: SPREADSHEET_ID or service account (ServX.json / GOOGLE_SHEETS_*) not set');
    return;
  }

  const { uid, email, role = 'user' } = userData;
  const dateJoined = new Date().toISOString();

  try {
    const auth = new JWT({
      email: CREDENTIALS.email,
      key: CREDENTIALS.key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(SPREADSHEET_ID, auth);
    await doc.loadInfo();

    const sheet = doc.sheetsByIndex[0];
    try {
      await sheet.loadHeaderRow();
    } catch {
      await sheet.setHeaderRow(HEADERS);
    }
    await sheet.addRow({
      [HEADERS[0]]: dateJoined,
      [HEADERS[1]]: uid,
      [HEADERS[2]]: email,
      [HEADERS[3]]: role,
    });

    console.log('[Sheets] New user logged:', email);
  } catch (err) {
    console.error('[Sheets] Failed to append row:', err.message);
    throw err;
  }
}

/**
 * Logs multiple users to the first sheet of the configured Google Spreadsheet.
 * @param {Array<Object>} usersData - Array of user data objects
 * @returns {Promise<void>}
 */
async function batchLogUsersToSheet(usersData) {
  if (!SPREADSHEET_ID || !CREDENTIALS) {
    console.warn('[Sheets] Skipping batch log: SPREADSHEET_ID or service account not set');
    return;
  }

  if (!usersData || usersData.length === 0) {
    console.log('[Sheets] No users to log');
    return;
  }

  try {
    const auth = new JWT({
      email: CREDENTIALS.email,
      key: CREDENTIALS.key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(SPREADSHEET_ID, auth);
    await doc.loadInfo();

    const sheet = doc.sheetsByIndex[0];
    try {
      await sheet.loadHeaderRow();
    } catch {
      await sheet.setHeaderRow(HEADERS);
    }

    const rows = usersData.map(userData => {
      const { uid, email, role = 'user', createdAt } = userData;
      const dateJoined = createdAt ? new Date(createdAt).toISOString() : new Date().toISOString();
      return {
        [HEADERS[0]]: dateJoined,
        [HEADERS[1]]: uid,
        [HEADERS[2]]: email,
        [HEADERS[3]]: role,
      };
    });

    await sheet.addRows(rows);
    console.log(`[Sheets] Batch export complete: ${rows.length} users added.`);
  } catch (err) {
    console.error('[Sheets] Failed to batch append rows:', err.message);
    throw err;
  }
}

module.exports = { logNewUserToSheet, batchLogUsersToSheet };
