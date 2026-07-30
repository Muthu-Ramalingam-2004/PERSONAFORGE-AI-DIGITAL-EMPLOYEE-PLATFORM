const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

let firebaseAdminInitialized = false;

try {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Handle newlines in private key
  const privateKey = process.env.FIREBASE_PRIVATE_KEY 
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') 
    : undefined;

  if (projectId && clientEmail && privateKey && projectId !== 'mock-firebase-project-id') {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    console.log('🛡️ Firebase Admin SDK initialized successfully.');
    firebaseAdminInitialized = true;
  } else {
    console.warn('⚠️ WARNING: Firebase environment variables are missing or set to mock. Running server with mock Firebase auth.');
  }
} catch (error) {
  console.error('❌ Error initializing Firebase Admin SDK:', error.message);
  console.warn('⚠️ Server will fall back to mock Firebase verification.');
}

module.exports = {
  admin: firebaseAdminInitialized ? admin : null,
  isInitialized: () => firebaseAdminInitialized
};
