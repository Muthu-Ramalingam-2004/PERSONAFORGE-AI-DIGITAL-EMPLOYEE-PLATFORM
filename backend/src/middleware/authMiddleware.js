const firebaseConfig = require('../config/firebase');
const db = require('../config/db');

const authMiddleware = async (req, res, next) => {
  try {
    const { getDbState } = require('../config/db');
    const dbState = getDbState();
    if (dbState === 'disconnected' || dbState === 'connecting') {
      return res.status(503).json({ success: false, message: 'Database not connected' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];

    let decodedToken;
    let firebaseUid;
    let email;
    let name;

    const firebaseAdmin = firebaseConfig.admin;

    if (firebaseConfig.isInitialized() && firebaseAdmin) {
      // Verify Firebase ID Token
      try {
        decodedToken = await firebaseAdmin.auth().verifyIdToken(token);
        firebaseUid = decodedToken.uid;
        email = decodedToken.email;
        name = decodedToken.name || email.split('@')[0];
      } catch (firebaseErr) {
        console.error('Firebase token verification failed:', firebaseErr.message);
        return res.status(401).json({ success: false, message: 'Unauthorized: Invalid token' });
      }
    } else {
      // Mock Authentication Mode (for local development and demoing without configuration)
      if (token.startsWith('mock-token-')) {
        // Format: mock-token-[email]-[name]-[uid]
        const parts = token.replace('mock-token-', '').split('-');
        email = parts[0] || 'mock-user@example.com';
        name = parts[1] || 'Mock User';
        firebaseUid = parts.slice(2).join('-') || 'mock-uid-12345';
        decodedToken = { uid: firebaseUid, email, name };
      } else {
        // Try fallback JWT verification if JWT token is passed
        try {
          const jwt = require('jsonwebtoken');
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key_for_personaforge');
          firebaseUid = decoded.uid || decoded.firebase_uid;
          email = decoded.email;
          name = decoded.name;
          decodedToken = decoded;
        } catch (jwtErr) {
          return res.status(401).json({ success: false, message: 'Unauthorized: Mock/JWT token invalid' });
        }
      }
    }

    // Now check if this user exists in our local PostgreSQL database
    let userResult = await db.query(
      'SELECT id, firebase_uid, email, name, role, subscription_plan FROM users WHERE firebase_uid = $1',
      [firebaseUid]
    );

    let user;

    if (userResult.rows.length === 0) {
      // Automatically register/sync the user record in PostgreSQL if they exist in Firebase/Mock but not locally.
      // This solves the sync issue transparently!
      console.log(`Syncing user ${email} from Firebase to PostgreSQL...`);
      const insertResult = await db.query(
        'INSERT INTO users (firebase_uid, email, name) VALUES ($1, $2, $3) RETURNING id, firebase_uid, email, name, role, subscription_plan',
        [firebaseUid, email, name]
      );
      user = insertResult.rows[0];

      // Also create default settings for this user
      try {
        await db.query(
          'INSERT INTO settings (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING',
          [user.id]
        );
      } catch (settingsErr) {
        console.error('Failed to create default settings for new user:', settingsErr.message);
      }
    } else {
      user = userResult.rows[0];
    }

    // Attach decoded token and DB user to request object
    req.firebaseUser = decodedToken;
    req.user = user;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    const isDbError =
      error.code === 'ECONNREFUSED' ||
      error.code === 'ENOTFOUND'    ||
      error.code === 'ETIMEDOUT'    ||
      error.code === '57P03'        ||
      error.statusCode === 503      ||
      /ECONNREFUSED|ENOTFOUND|ETIMEDOUT|connection pool/i.test(error.message || '');
    if (isDbError) {
      return res.status(503).json({ success: false, message: 'Database not connected' });
    }
    return res.status(500).json({ success: false, message: 'Internal Server Error in Authentication' });
  }
};

module.exports = authMiddleware;
