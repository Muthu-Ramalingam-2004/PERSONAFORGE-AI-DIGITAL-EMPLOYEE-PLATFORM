const db = require('../config/db');

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

module.exports = {
  syncUser,
  getUserProfile,
  updateUserProfile
};
