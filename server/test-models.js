
require('dotenv').config();

const { GoogleGenAI } = require('@google/genai');

async function checkModels() {
  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY
    });

    console.log('Checking available Gemini models...\n');

    const models = await ai.models.list();

    for await (const model of models) {
      if (model.supportedActions?.includes('generateContent')) {
        console.log('Model:', model.name);
        console.log('Display name:', model.displayName);
        console.log('-------------------------');
      }
    }

  } catch (error) {
    console.error('Model check failed:', error.message);
  }
}

checkModels();
