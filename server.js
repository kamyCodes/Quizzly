const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk');
require('dotenv').config();

const app = express();
const PORT = 3000;

// Middleware - Increased limits for large document uploads
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'Quiz Backend Server is running with Groq AI!' });
});

// Generate quiz from topic
app.post('/api/generate-quiz', async (req, res) => {
  try {
    const { topic, numQuestions, difficulty } = req.body;

    if (!topic || !numQuestions || !difficulty) {
      return res.status(400).json({ 
        error: 'Missing required fields: topic, numQuestions, difficulty' 
      });
    }

    console.log(`Generating quiz: ${topic}, ${numQuestions} questions, ${difficulty} difficulty`);

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a quiz generation expert. You create educational, engaging multiple-choice questions. Always respond with valid JSON only, no markdown or extra text.',
        },
        {
          role: 'user',
          content: `Generate ${numQuestions} multiple-choice quiz questions about "${topic}" at ${difficulty} difficulty level.

Return ONLY a valid JSON object with this exact structure (no markdown, no backticks, no extra text):
{
  "title": "Quiz title about ${topic}",
  "questions": [
    {
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0
    }
  ]
}

Rules:
- Each question must have exactly 4 options
- correctAnswer must be the index (0-3) of the correct option
- Make questions engaging and educational
- Ensure ${difficulty} difficulty is appropriate
- Return ONLY the JSON object, nothing else`,
        },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 2000,
    });

    // Extract the response text
    const responseText = completion.choices[0]?.message?.content;
    
    if (!responseText) {
      throw new Error('No response from AI');
    }

    // Try to parse the JSON
    let quizData;
    try {
      // Remove any markdown code blocks if present
      const cleanText = responseText.replace(/```json\n?|\n?```/g, '').trim();
      quizData = JSON.parse(cleanText);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.error('Response Text:', responseText);
      return res.status(500).json({ 
        error: 'Failed to parse AI response',
        details: responseText 
      });
    }

    // Validate the quiz data structure
    if (!quizData.title || !Array.isArray(quizData.questions)) {
      return res.status(500).json({ 
        error: 'Invalid quiz data structure',
        data: quizData 
      });
    }

    // Validate each question
    for (const q of quizData.questions) {
      if (!q.question || !Array.isArray(q.options) || q.options.length !== 4 || 
          typeof q.correctAnswer !== 'number' || q.correctAnswer < 0 || q.correctAnswer > 3) {
        return res.status(500).json({ 
          error: 'Invalid question structure',
          question: q 
        });
      }
    }

    console.log('✅ Quiz generated successfully with Groq AI!');
    res.json(quizData);

  } catch (error) {
    console.error('❌ Error generating quiz:', error);
    res.status(500).json({ 
      error: 'Failed to generate quiz',
      message: error.message 
    });
  }
});

// Generate quiz from document
app.post('/api/generate-quiz-from-document', async (req, res) => {
  try {
    const { documentText, numQuestions, difficulty } = req.body;

    if (!documentText || !numQuestions || !difficulty) {
      return res.status(400).json({ 
        error: 'Missing required fields: documentText, numQuestions, difficulty' 
      });
    }

    console.log(`Generating quiz from document, ${numQuestions} questions, ${difficulty} difficulty`);

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a quiz generation expert. You create educational questions based on provided documents. Always respond with valid JSON only, no markdown or extra text.',
        },
        {
          role: 'user',
          content: `Based on the following document, generate ${numQuestions} multiple-choice quiz questions at ${difficulty} difficulty level:

Document:
${documentText}

Return ONLY a valid JSON object with this exact structure (no markdown, no backticks, no extra text):
{
  "title": "Quiz title based on the document content",
  "questions": [
    {
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0
    }
  ]
}

Rules:
- Questions must be based on the document content
- Each question must have exactly 4 options
- correctAnswer must be the index (0-3) of the correct option
- Make questions test understanding of the document
- Ensure ${difficulty} difficulty is appropriate
- Return ONLY the JSON object, nothing else`,
        },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 2000,
    });

    const responseText = completion.choices[0]?.message?.content;
    
    if (!responseText) {
      throw new Error('No response from AI');
    }

    let quizData;
    try {
      const cleanText = responseText.replace(/```json\n?|\n?```/g, '').trim();
      quizData = JSON.parse(cleanText);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      return res.status(500).json({ 
        error: 'Failed to parse AI response',
        details: responseText 
      });
    }

    // Validate structure
    if (!quizData.title || !Array.isArray(quizData.questions)) {
      return res.status(500).json({ 
        error: 'Invalid quiz data structure',
        data: quizData 
      });
    }

    console.log('✅ Document-based quiz generated successfully with Groq AI!');
    res.json(quizData);

  } catch (error) {
    console.error('❌ Error generating quiz from document:', error);
    res.status(500).json({ 
      error: 'Failed to generate quiz from document',
      message: error.message 
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║   🎯 Quiz Backend Server Running!    ║
║      Powered by Groq AI (FREE!)      ║
╚═══════════════════════════════════════╝

Server URL: http://localhost:${PORT}
AI Model: Llama 3.3 70B (via Groq)
API Endpoints:
  • POST /api/generate-quiz
  • POST /api/generate-quiz-from-document

Status: Ready to generate FREE AI-powered quizzes! 🚀
Max Upload Size: 50MB
  `);
});
