/**
 * New User Logging Pipeline - Google Sheets Service
 * ================================================
 */

const path = require('path');
const fs = require('fs');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

function getServiceAccountCredentials() {
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

const HEADERS = ['Username', 'UID', 'Email', 'Date'];

const formatDate = (date) => {
  if (!date) date = new Date();
  const d = new Date(date);
  const day = d.getDate();
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
};

/**
 * Logs a new user to the first sheet of the configured Google Spreadsheet.
 */
async function logNewUserToSheet(userData) {
  if (!SPREADSHEET_ID || !CREDENTIALS) {
    console.warn('[Sheets] Skipping login: SPREADSHEET_ID or service account not set');
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
    const { uid, email } = userData;
    const username = email ? email.split('@')[0] : (uid || 'unknown');
    const dateStr = formatDate(new Date());

    try {
      await sheet.loadHeaderRow();
    } catch {
      await sheet.setHeaderRow(HEADERS);
    }

    await sheet.addRow({
      [HEADERS[0]]: username,
      [HEADERS[1]]: uid,
      [HEADERS[2]]: email,
      [HEADERS[3]]: dateStr,
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
 * @param {boolean} [overwrite=false] - Whether to clear the sheet first
 */
async function batchLogUsersToSheet(usersData, overwrite = false) {
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

    if (overwrite) {
      console.log('[Sheets] Overwriting sheet and setting new headers...');
      await sheet.clear();
      await sheet.setHeaderRow(HEADERS);
    } else {
      try {
        await sheet.loadHeaderRow();
      } catch {
        await sheet.setHeaderRow(HEADERS);
      }
    }

    const rows = usersData.map(userData => {
      const { uid, email, createdAt } = userData;
      const username = email ? email.split('@')[0] : (uid || 'unknown');
      const dateStr = formatDate(createdAt);
      
      return {
        [HEADERS[0]]: username,
        [HEADERS[1]]: uid,
        [HEADERS[2]]: email,
        [HEADERS[3]]: dateStr,
      };
    });

    await sheet.addRows(rows);
    console.log(`[Sheets] Batch export complete: ${rows.length} users added.`);
  } catch (err) {
    console.error('[Sheets] Failed to batch append rows:', err.message);
    throw err;
  }
}

module.exports = { 
  logNewUserToSheet, 
  batchLogUsersToSheet 
};
