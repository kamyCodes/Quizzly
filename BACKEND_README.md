# Quizzly Backend

This is the backend server for the Quizzly app.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Get your free Groq API key:
   - Visit https://console.groq.com/keys
   - Sign up for a free account
   - Create a new API key
   - Copy the key

3. Update the `.env` file:
   - Open `.env` in this folder
   - Replace `your_groq_api_key_here` with your actual Groq API key

4. Start the backend server:
```bash
npm run server
```

The server will run on http://localhost:3000

## Features

- **50MB upload limit** for large documents
- **Free AI-powered quiz generation** using Groq's Llama 3.3 70B model
- Supports both topic-based and document-based quiz generation

## API Endpoints

- `POST /api/generate-quiz` - Generate quiz from a topic
- `POST /api/generate-quiz-from-document` - Generate quiz from uploaded documents
