# 🎯 Quizzly

> **AI-Powered Knowledge Check**  
> *Generate, Play, and Master any topic with the power of AI.*

[![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)](https://expressjs.com/)
[![Groq AI](https://img.shields.io/badge/Powered_by-Groq_AI-f55036?style=for-the-badge)](https://groq.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

---

## 📖 About

**Quizzly** is a modern, interactive quiz application that leverages the power of **Groq AI (Llama 3.3 70B)** to generate high-quality quizzes instantly. Whether you want to test your knowledge on a specific **topic** or generate questions from your own **documents**, Quizzly makes learning fun and efficient.

Built with **React Native (Expo)** for a seamless cross-platform experience and an **Express.js** backend for robust AI processing.

---

## ✨ Features

### 🧠 AI-Powered Generation
*   **Topic-Based Quizzes:** Simply type a topic (e.g., "Quantum Physics", "French History") and get a custom quiz instantly.
*   **Document-Based Quizzes:** Upload text files (up to **50MB**) and let the AI extract key concepts to test your understanding.
*   **Customizable:** Choose your difficulty level (Easy, Medium, Hard) and number of questions.

### 🎨 Beautiful & Interactive UI
*   **Smooth Animations:** Enjoy fluid transitions and micro-interactions powered by `Animated` API.
*   **Modern Design:** Sleek gradients, glassmorphism effects, and a polished user experience.
*   **Progress Tracking:** Visual progress bars and instant feedback on your answers.

### 💾 Smart Library
*   **Save Quizzes:** Keep your favorite quizzes to retake them later.
*   **Offline Access:** Access your saved quizzes anytime (local storage).
*   **Result Insights:** Get immediate scoring and encouraging feedback based on your performance.

---

## 🛠️ Tech Stack

*   **Frontend:** React Native, Expo, React Native Web, Expo Linear Gradient
*   **Backend:** Node.js, Express.js, CORS
*   **AI Engine:** Groq SDK (Llama 3.3 70B Versatile model)
*   **Storage:** Async Storage
*   **File Handling:** Expo Document Picker, PDF Parse (backend capability)

---

## 🚀 Getting Started

Follow these steps to get Quizzly running on your local machine.

### Prerequisites

*   **Node.js** (v14 or higher)
*   **npm** or **yarn**
*   **Expo Go** app (for testing on mobile)

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/kamyCodes/Quizzly.git
    cd Quizzly
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

### 🔑 Configuration

1.  **Get a Groq API Key**
    *   Visit [Groq Console](https://console.groq.com/keys) to get your **FREE** API key.

2.  **Set up Environment Variables**
    *   Copy the example environment file:
        ```bash
        cp .env.example .env
        ```
    *   Open `.env` and paste your API key:
        ```env
        GROQ_API_KEY=gsk_your_actual_api_key_here
        ```

### 🏃‍♂️ Running the App

You need to run both the backend server and the frontend application.

**1. Start the Backend Server**
```bash
npm run server
```
*The server will start at `http://localhost:3000`*

**2. Start the Expo App**
Open a new terminal window and run:
```bash
npm start
```
*   Press `a` for Android emulator
*   Press `i` for iOS simulator
*   Press `w` for Web
*   Or scan the QR code with the **Expo Go** app on your phone.

---

## 🔌 API Documentation

The backend exposes two main endpoints:

### 1. Generate Quiz from Topic
*   **Endpoint:** `POST /api/generate-quiz`
*   **Body:**
    ```json
    {
      "topic": "Space Exploration",
      "numQuestions": 5,
      "difficulty": "medium"
    }
    ```

### 2. Generate Quiz from Document
*   **Endpoint:** `POST /api/generate-quiz-from-document`
*   **Body:**
    ```json
    {
      "documentText": "Full text content of your file...",
      "numQuestions": 10,
      "difficulty": "hard"
    }
    ```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1.  Fork the project
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <sub>Built with ❤️ by KamyCodes</sub>
</div>
