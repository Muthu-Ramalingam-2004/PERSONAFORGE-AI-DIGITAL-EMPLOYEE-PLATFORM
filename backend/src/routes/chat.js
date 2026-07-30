const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authMiddleware = require('../middleware/authMiddleware');

// Get all chats sessions
router.get('/', authMiddleware, chatController.getAllChats);

// Get messages of a specific chat session
router.get('/:chatId/messages', authMiddleware, chatController.getChatMessages);

// Create new chat session
router.post('/', authMiddleware, chatController.createChatSession);

// Send message to AI and receive response
router.post('/:chatId/messages', authMiddleware, chatController.sendMessageToAI);

// Delete chat session
router.delete('/:chatId', authMiddleware, chatController.deleteChatSession);

module.exports = router;
