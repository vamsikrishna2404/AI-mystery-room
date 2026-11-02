
const generateGeminiResponse = async (prompt) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('Gemini API key is missing in .env');
    }

    const { GoogleGenAI } = await import('@google/genai');

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY
    });

    console.log('Sending request to Gemini...');

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: prompt
    });

    if (!response.text) {
      throw new Error('Gemini returned an empty response');
    }

    console.log('Gemini response received!');

    return response.text;

  } catch (error) {
    console.error('Gemini API Error:', error.message);
    throw error;
  }
};

module.exports = generateGeminiResponse;
