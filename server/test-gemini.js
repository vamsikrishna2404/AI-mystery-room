
require('dotenv').config();

const generateGeminiResponse = require('./config/gemini');

async function testGemini() {
  try {
    console.log('Connecting to Gemini AI...');

    const response = await generateGeminiResponse(
      'Write a two-sentence detective mystery about a stolen diamond.'
    );

    console.log('\nGemini AI Response:\n');
    console.log(response);

    console.log('\nGemini AI connected successfully!');

  } catch (error) {
    console.error('Test failed:', error.message);
    process.exitCode = 1;
  }
}

testGemini();
