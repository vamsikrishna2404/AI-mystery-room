
require('dotenv').config();

async function testGeneration() {
  try {
    const { GoogleGenAI } = await import('@google/genai');

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY
    });

    console.log('Testing Gemini 2.5 Flash Lite...');

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: 'Reply with exactly: GEMINI_OK'
    });

    console.log('\nGemini response:');
    console.log(response.text);
    console.log('\nSUCCESS! Gemini is working.');

  } catch (error) {
    console.error('\nGeneration failed:');
    console.error(error.message);
  }
}

testGeneration();
