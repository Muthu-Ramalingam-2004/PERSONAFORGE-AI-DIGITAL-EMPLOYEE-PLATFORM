const db = require('../config/db');
const crypto = require('crypto');
const firebaseConfig = require('../config/firebase');

// Sync user authenticated via Firebase with PostgreSQL database
const syncUser = async (req, res, next) => {
  try {
    // req.user has already been populated by authMiddleware
    res.status(200).json({
      success: true,
      message: 'User profile synchronized successfully',
      user: req.user
    });
  } catch (error) {
    next(error);
  }
};

// Retrieve authenticated user's profile information
const getUserProfile = async (req, res, next) => {
  try {
    // req.user is fetched during authentication
    res.status(200).json({
      success: true,
      user: req.user
    });
  } catch (error) {
    next(error);
  }
};

// Update user details in the database
const updateUserProfile = async (req, res, next) => {
  try {
    const { name } = req.body;
    const userId = req.user.id;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Name is required'
      });
    }

    const result = await db.query(
      'UPDATE users SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, firebase_uid, email, name, role, subscription_plan',
      [name, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Log the profile update action
    try {
      await db.query(
        'INSERT INTO activity_logs (user_id, action, details) VALUES ($1, $2, $3)',
        [userId, 'profile_update', `Updated profile name to ${name}`]
      );
    } catch (logErr) {
      console.error('Failed to log activity:', logErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// Reset password directly without email/OTP verification
const resetPasswordNoOtp = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username/Email and new password are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters.'
      });
    }

    // 1. Verify that the entered Username/Email exists in database
    const userResult = await db.query(
      'SELECT id, firebase_uid, email, name FROM users WHERE LOWER(email) = LOWER($1) OR LOWER(name) = LOWER($1)',
      [email.trim()]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No account matches this username/email address.'
      });
    }

    const user = userResult.rows[0];
    
    // Hash new password using SHA-256 (standard Node crypto)
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

    // 2. Update the password in PostgreSQL (Supabase) database
    await db.query(
      'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedPassword, user.id]
    );

    // 3. Update in Firebase if active
    const firebaseAdmin = firebaseConfig.admin;
    if (firebaseConfig.isInitialized() && firebaseAdmin) {
      try {
        await firebaseAdmin.auth().updateUser(user.firebase_uid, {
          password: password
        });
        console.log(`Successfully updated Firebase Auth password for user: ${user.email}`);
      } catch (fbErr) {
        console.error('Failed to update password in Firebase Auth:', fbErr.message);
      }
    }

    // Log the password update in activity logs
    try {
      await db.query(
        'INSERT INTO activity_logs (user_id, action, details) VALUES ($1, $2, $3)',
        [user.id, 'password_reset', 'Reset password directly via inline form']
      );
    } catch (logErr) {
      console.error('Failed to log activity:', logErr.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Password updated successfully.'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  syncUser,
  getUserProfile,
  updateUserProfile,
  resetPasswordNoOtp
};
