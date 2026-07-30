const db = require('../config/db');
const gemini = require('../utils/gemini');

// Retrieve all chat sessions for the authenticated user
const getAllChats = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await db.query(
      `SELECT c.*, e.name as employee_name, e.avatar_url as employee_avatar, e.category as employee_category 
       FROM chats c 
       JOIN ai_employees e ON c.employee_id = e.id 
       WHERE c.user_id = $1 
       ORDER BY c.updated_at DESC`,
      [userId]
    );

    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
};

// Retrieve conversation history of a specific chat session
const getChatMessages = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { chatId } = req.params;

    // Verify chat ownership
    const chatCheck = await db.query(
      'SELECT id FROM chats WHERE id = $1 AND user_id = $2',
      [chatId, userId]
    );

    if (chatCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Chat session not found or unauthorized'
      });
    }

    const messages = await db.query(
      'SELECT id, sender, content, created_at FROM messages WHERE chat_id = $1 ORDER BY created_at ASC',
      [chatId]
    );

    res.status(200).json({
      success: true,
      data: messages.rows
    });
  } catch (error) {
    next(error);
  }
};

// Create a new chat session with an AI employee
const createChatSession = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { employeeId, title } = req.body;

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'AI Employee ID is required'
      });
    }

    // Verify employee exists and belongs to the user
    const empCheck = await db.query(
      'SELECT name FROM ai_employees WHERE id = $1 AND user_id = $2',
      [employeeId, userId]
    );

    if (empCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'AI Employee not found or unauthorized'
      });
    }

    const empName = empCheck.rows[0].name;
    const chatTitle = title || `Chat with ${empName}`;

    const chatInsert = await db.query(
      'INSERT INTO chats (user_id, employee_id, title) VALUES ($1, $2, $3) RETURNING *',
      [userId, employeeId, chatTitle]
    );

    res.status(201).json({
      success: true,
      data: chatInsert.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// Send a message and generate Google Gemini AI response
const sendMessageToAI = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { chatId } = req.params;
    const { message } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Message content is required'
      });
    }

    // 1. Verify chat ownership and retrieve Employee config
    const chatConfig = await db.query(
      `SELECT c.id, c.employee_id, e.name, p.system_prompt, p.personality_prompt, p.goal, p.tone, p.temperature, p.max_tokens 
       FROM chats c 
       JOIN ai_employees e ON c.employee_id = e.id 
       JOIN prompts p ON e.id = p.employee_id 
       WHERE c.id = $1 AND c.user_id = $2`,
      [chatId, userId]
    );

    if (chatConfig.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Chat session not found or unauthorized'
      });
    }

    const chat = chatConfig.rows[0];

    // 2. Save User message to database
    const userMessageResult = await db.query(
      'INSERT INTO messages (chat_id, sender, content) VALUES ($1, $2, $3) RETURNING *',
      [chatId, 'user', message]
    );
    const userMessage = userMessageResult.rows[0];

    // Update chat session timestamp
    await db.query('UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [chatId]);

    // 3. Fetch chat history context for Gemini (limit to last 15 messages for token optimization)
    const historyResult = await db.query(
      `SELECT sender, content 
       FROM messages 
       WHERE chat_id = $1 AND id != $2
       ORDER BY created_at DESC 
       LIMIT 15`,
      [chatId, userMessage.id]
    );
    // Reverse to chronological order
    const history = historyResult.rows.reverse();

    // 3.5 Fetch knowledge base chunks for RAG context (simple keyword matches)
    const keywords = message.split(' ').filter(k => k.trim().length > 2);
    let ragContext = '';
    
    if (keywords.length > 0) {
      try {
        const queryParams = [chat.employee_id];
        const likes = keywords.slice(0, 5).map((kw, idx) => {
          queryParams.push(`%${kw}%`);
          return `content ILIKE $${idx + 2}`;
        });
        
        const chunksResult = await db.query(
          `SELECT content FROM document_chunks 
           WHERE employee_id = $1 AND (${likes.join(' OR ')}) 
           LIMIT 3`,
          queryParams
        );
        
        if (chunksResult.rows.length > 0) {
          ragContext = chunksResult.rows.map(r => r.content).join('\n\n');
          console.log(`[RAG INTEGRATION] Appended ${chunksResult.rows.length} relevant context chunks.`);
        }
      } catch (ragErr) {
        console.error('RAG query failed:', ragErr.message);
      }
    }

    // 4. Construct System instructions combining Prompt parameters and RAG Context
    let systemInstruction = `
      ${chat.system_prompt}
      
      Personality: ${chat.personality_prompt || 'Helpful assistant'}
      Goal: ${chat.goal || 'Address user questions'}
      Tone: Use a ${chat.tone || 'professional'} tone.
    `;

    if (ragContext) {
      systemInstruction += `\n\nReference the following knowledge base context to answer the user's questions if relevant. Do not mention "reference documents" or "knowledge base context" in your reply, just answer naturally as part of your knowledge:\n\n${ragContext}`;
    }

    // 5. Generate Response from Gemini
    const startTime = Date.now();
    let aiResponseText = '';
    
    try {
      aiResponseText = await gemini.generateResponse(
        systemInstruction,
        message,
        history,
        {
          temperature: chat.temperature,
          maxTokens: chat.max_tokens
        }
      );
    } catch (aiErr) {
      console.error('Gemini generation failed:', aiErr.message);
      // Fallback response if API fails
      aiResponseText = `I apologize, but I encountered an error executing my cognitive system. Details: ${aiErr.message}`;
    }
    
    const responseTime = Date.now() - startTime;

    // 6. Save AI Response to database
    const aiMessageResult = await db.query(
      'INSERT INTO messages (chat_id, sender, content) VALUES ($1, $2, $3) RETURNING *',
      [chatId, 'ai', aiResponseText]
    );
    const aiMessage = aiMessageResult.rows[0];

    // 7. Save to analytics log
    const estimatedTokens = Math.floor((message.length + aiResponseText.length) / 4) + 100; // rough estimation if not available
    try {
      await db.query(
        `INSERT INTO analytics (user_id, employee_id, usage_count, response_time, tokens_used) 
         VALUES ($1, $2, 1, $3, $4)`,
        [userId, chat.employee_id, responseTime, estimatedTokens]
      );
    } catch (analErr) {
      console.error('Failed to log analytics:', analErr.message);
    }

    res.status(200).json({
      success: true,
      data: {
        userMessage,
        aiMessage
      }
    });
  } catch (error) {
    next(error);
  }
};

// Delete a chat session
const deleteChatSession = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { chatId } = req.params;

    const result = await db.query(
      'DELETE FROM chats WHERE id = $1 AND user_id = $2 RETURNING id',
      [chatId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Chat session not found or unauthorized'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Chat session deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllChats,
  getChatMessages,
  createChatSession,
  sendMessageToAI,
  deleteChatSession
};
