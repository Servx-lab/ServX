const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin SDK
// Priority: 1) Service Account JSON file  2) Application Default with projectId
if (!admin.apps.length) {
  try {
    const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account.json');
    
    if (fs.existsSync(serviceAccountPath)) {
      // Best option: use the downloaded service account key file
      const serviceAccount = require(serviceAccountPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id
      });
      console.log('Firebase Admin Initialized with Service Account');
    } else {
      // Fallback: use just the project ID from env
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || 'orizon-lab'
      });
      console.log('Firebase Admin Initialized with Project ID (limited - no service account)');
    }
  } catch (error) {
    console.error('Firebase Admin Initialization Error:', error.message);
  }
}

module.exports = admin;