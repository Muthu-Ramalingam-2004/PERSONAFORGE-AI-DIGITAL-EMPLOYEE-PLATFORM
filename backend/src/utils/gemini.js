const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

let genAI = null;
const apiKey = process.env.GEMINI_API_KEY;

if (apiKey && apiKey !== 'mock_gemini_api_key' && apiKey.trim() !== '') {
  try {
    genAI = new GoogleGenerativeAI(apiKey);
    console.log('🤖 Google Gemini AI client initialized successfully.');
  } catch (error) {
    console.error('❌ Failed to initialize Google Gemini AI client:', error.message);
  }
} else {
  console.warn('⚠️ WARNING: GEMINI_API_KEY is missing or set to mock. Running AI chat in offline mock demo mode.');
}

/**
 * Generate a response using Google Gemini API
 * @param {string} systemPrompt - Instruction defining persona/role
 * @param {string} userMessage - The current message from the user
 * @param {Array} history - Array of previous messages: [{ role: 'user'|'model', parts: [{ text: string }] }]
 * @param {object} params - Optional: temperature, maxTokens
 */
const generateResponse = async (systemPrompt, userMessage, history = [], params = {}) => {
  try {
    const temperature = params.temperature !== undefined ? parseFloat(params.temperature) : 0.7;
    const maxOutputTokens = params.maxTokens !== undefined ? parseInt(params.maxTokens) : 1000;

    if (!genAI) {
      // Return simulated/mock response in offline dev mode
      await new Promise(resolve => setTimeout(resolve, 800)); // simulate latency
      return `[OFFLINE DEMO MODE] Hello! I am your AI digital employee responding in mock mode because GEMINI_API_KEY is not configured in the backend environment. 

Here is what you sent me: "${userMessage}"
System Prompt configured: "${systemPrompt.substring(0, 100)}..."`;
    }

    // Use gemini-1.5-flash as it is fast, stable, and cost-efficient for SaaS apps
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature,
        maxOutputTokens,
      },
      systemInstruction: systemPrompt
    });

    // Format chat history for Gemini SDK:
    // [{ role: 'user', parts: [{ text: '...' }] }, { role: 'model', parts: [{ text: '...' }] }]
    const formattedHistory = history.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    // Start a chat session
    const chatSession = model.startChat({
      history: formattedHistory,
    });

    const result = await chatSession.sendMessage(userMessage);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating AI response:', error);
    throw new Error(`AI inference failed: ${error.message}`);
  }
};

module.exports = {
  generateResponse,
  isAIReady: () => genAI !== null
};
