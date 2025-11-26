import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  StatusBar,
  Platform,
  Dimensions,
  Animated,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';

// Enable LayoutAnimation on Android
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Backend API URL
const API_URL = 'http://localhost:3000';

const { width } = Dimensions.get('window');

const Toast = ({ message, type, onHide }) => {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(3000),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => onHide());
  }, []);

  const backgroundColor = type === 'error' ? '#ff4b4b' : '#4caf50';
  const icon = type === 'error' ? '⚠️' : '✅';

  return (
    <Animated.View style={[styles.toast, { opacity, backgroundColor }]}>
      <Text style={styles.toastIcon}>{icon}</Text>
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
};

export default function App() {
  const [screen, setScreen] = useState('home');
  const [topic, setTopic] = useState('');
  const [numQuestions, setNumQuestions] = useState('5');
  const [difficulty, setDifficulty] = useState('medium');
  const [quiz, setQuiz] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswers, setUserAnswers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savedQuizzes, setSavedQuizzes] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [generateMode, setGenerateMode] = useState('topic'); // 'topic' or 'upload'
  const [toast, setToast] = useState(null); // { message, type }

  // Animations
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Load saved quizzes on app start
  useEffect(() => {
    loadSavedQuizzes();
  }, []);

  // Animate screen transitions
  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(50);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [screen]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  // Load saved quizzes from storage
  const loadSavedQuizzes = async () => {
    try {
      const saved = await AsyncStorage.getItem('savedQuizzes');
      if (saved) {
        setSavedQuizzes(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading saved quizzes:', error);
    }
  };

  // Save quizzes to storage
  const saveSavedQuizzes = async (quizzes) => {
    try {
      await AsyncStorage.setItem('savedQuizzes', JSON.stringify(quizzes));
    } catch (error) {
      console.error('Error saving quizzes:', error);
    }
  };

  // Helper to handle API errors safely
  const handleApiError = async (response) => {
    if (response.status === 413) {
      throw new Error('File is too large. Please upload a smaller document.');
    }
    
    const text = await response.text();
    console.log('Raw API Error Response:', text); // Debugging

    try {
      const data = JSON.parse(text);
      const error = new Error(data.error || `Server error: ${response.status}`);
      if (data.details) error.details = data.details;
      throw error;
    } catch (e) {
      // If parsing fails, it might be an HTML error page or raw text
      // Check if the error was already thrown in the try block
      if (e.message !== 'Unexpected token' && !e.message.includes('JSON')) {
         throw e;
      }
      
      // Fallback for non-JSON errors
      const errorMessage = text.length < 200 ? text : `Server error (${response.status}). Please try again.`;
      throw new Error(errorMessage);
    }
  };

  // Generate quiz from topic
  const generateQuiz = async () => {
    if (!topic.trim()) {
      showToast('Please enter a topic', 'error');
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/api/generate-quiz`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: topic.trim(),
          numQuestions: parseInt(numQuestions),
          difficulty,
        }),
      });

      if (!response.ok) {
        await handleApiError(response);
      }

      const quizData = await response.json();
      setQuiz(quizData);
      setCurrentQuestion(0);
      setUserAnswers([]);
      setScreen('quiz');
      
    } catch (error) {
      console.error('Error:', error);
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Generate quiz from multiple documents
  const generateQuizFromDocuments = async (documentsText) => {
    if (!documentsText || !documentsText.trim()) {
      showToast('Document text is empty', 'error');
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/api/generate-quiz-from-document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentText: documentsText.trim(),
          numQuestions: parseInt(numQuestions),
          difficulty,
        }),
      });

      if (!response.ok) {
        await handleApiError(response);
      }

      const quizData = await response.json();
      setQuiz(quizData);
      setCurrentQuestion(0);
      setUserAnswers([]);
      setSelectedFiles([]);
      setScreen('quiz');
      
    } catch (error) {
      console.error('Error:', error);
      
      // Attempt to recover from "Failed to parse AI response" if details are present
      if (error.details) {
        try {
          // Extract JSON from text (find first { and last })
          const jsonMatch = error.details.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const rawData = JSON.parse(jsonMatch[0]);
            
            let questions = [];

            // Handle format: {"questions": [...]}
            if (rawData.questions && Array.isArray(rawData.questions)) {
              questions = rawData.questions.map(q => ({
                question: q.question,
                options: q.options,
                correctAnswer: typeof q.answer === 'number' ? q.answer : 0
              }));
            } 
            // Handle previous format: {"question1": {...}, "question2": {...}}
            else {
               questions = Object.values(rawData).map(q => {
                const options = [q.A, q.B, q.C, q.D].filter(Boolean);
                const letterMap = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
                const correctIndex = letterMap[q.correct] !== undefined ? letterMap[q.correct] : 0;
                
                return {
                  question: q.question,
                  options: options,
                  correctAnswer: correctIndex
                };
              });
            }

            if (questions.length > 0) {
              const quizData = {
                title: 'Document Quiz', // Default title
                questions: questions
              };
              
              setQuiz(quizData);
              setCurrentQuestion(0);
              setUserAnswers([]);
              setSelectedFiles([]);
              setScreen('quiz');
              return; // Successfully recovered
            }
          }
        } catch (recoveryError) {
          console.error('Failed to recover quiz from error details:', recoveryError);
        }
      }

      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle file selection (native)
  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/plain', // Only accept text files
        multiple: true,
        copyToCacheDirectory: true
      });

      if (result.canceled) return;

      const files = result.assets || [];
      
      // Validate file types
      const invalidFiles = files.filter(f => {
        const fileName = f.name.toLowerCase();
        return !fileName.endsWith('.txt');
      });
      
      if (invalidFiles.length > 0) {
        showToast('Only .txt files are supported. PDFs are not supported yet.', 'error');
        return;
      }
      
      // Check file size (limit to ~10MB per file)
      const MAX_SIZE = 10 * 1024 * 1024; 
      const largeFiles = files.filter(f => f.size && f.size > MAX_SIZE);
      
      if (largeFiles.length > 0) {
        showToast('One or more files exceed the 10MB limit.', 'error');
        return;
      }

      if (files.length > 3) {
        showToast('You can only upload up to 3 files', 'error');
        return;
      }
      
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setSelectedFiles(files);
    } catch (err) {
      console.error(err);
      showToast('Failed to pick document: ' + err.message, 'error');
    }
  };

  const removeFile = (index) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const newFiles = [...selectedFiles];
    newFiles.splice(index, 1);
    setSelectedFiles(newFiles);
  };

  // Process and generate quiz from files
  const processFilesAndGenerateQuiz = async () => {
    if (selectedFiles.length === 0) {
      showToast('Please select at least one file', 'error');
      return;
    }

    setLoading(true);

    try {
      let combinedText = '';
      
      for (const file of selectedFiles) {
        const text = await readFileAsText(file);
        combinedText += `\n\n=== ${file.name} ===\n${text}`;
      }

      if (!combinedText.trim()) {
        throw new Error('No text content found in the files');
      }

      // Check text length to prevent 413 Payload Too Large errors
      if (combinedText.length > 500000) {
        throw new Error(`Total text content is too large (${combinedText.length} characters). Please use smaller or fewer documents.`);
      }

      await generateQuizFromDocuments(combinedText);
    } catch (error) {
      console.error('Error processing files:', error);
      showToast(`Failed to process files: ${error.message}`, 'error');
      setLoading(false);
    }
  };

  // Read file as text
  const readFileAsText = async (file) => {
    if (Platform.OS === 'web') {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file.file);
      });
    } else {
      try {
        const response = await fetch(file.uri);
        const text = await response.text();
        return text;
      } catch (error) {
        throw error;
      }
    }
  };

  // Handle answer selection
  const selectAnswer = (answerIndex) => {
    const newAnswers = [...userAnswers];
    newAnswers[currentQuestion] = answerIndex;
    setUserAnswers(newAnswers);
  };

  // Navigate to next question
  const nextQuestion = () => {
    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setScreen('results');
    }
  };

  // Navigate to previous question
  const previousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  // Save quiz
  const saveQuiz = () => {
    // Check if already saved
    if (quiz.id && savedQuizzes.some(q => q.id === quiz.id)) {
      showToast('Quiz already saved!', 'info');
      return;
    }

    const newQuiz = {
      ...quiz,
      id: quiz.id || Date.now(),
      savedAt: new Date().toLocaleString(),
    };
    
    const updatedQuizzes = [...savedQuizzes, newQuiz];
    setSavedQuizzes(updatedQuizzes);
    saveSavedQuizzes(updatedQuizzes);
    setQuiz(newQuiz); // Update current quiz with ID
    showToast('Quiz saved successfully!', 'success');
  };

  // Delete quiz
  const deleteQuiz = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const updatedQuizzes = savedQuizzes.filter((q) => q.id !== id);
    setSavedQuizzes(updatedQuizzes);
    saveSavedQuizzes(updatedQuizzes);
  };

  // --- Render Functions ---

  const renderHome = () => (
    <Animated.View style={[styles.contentContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>🎯</Text>
        </View>
        <Text style={styles.title}>Quizzly</Text>
        <Text style={styles.subtitle}>AI-Powered Knowledge Check</Text>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        activeOpacity={0.8}
        onPress={() => setScreen('generate')}>
        <LinearGradient
          colors={['#FF416C', '#FF4B2B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientButton}>
          <Text style={styles.buttonText}>➕ Create New Quiz</Text>
        </LinearGradient>
      </TouchableOpacity>

      {savedQuizzes.length > 0 ? (
        <View style={styles.savedSection}>
          <Text style={styles.sectionTitle}>Your Library</Text>
          {savedQuizzes.map((sq) => (
            <View key={sq.id} style={styles.card}>
              <TouchableOpacity
                style={styles.savedQuizContent}
                onPress={() => {
                  setQuiz(sq);
                  setCurrentQuestion(0);
                  setUserAnswers([]);
                  setScreen('quiz');
                }}>
                <Text style={styles.savedQuizTitle}>{sq.title}</Text>
                <Text style={styles.savedQuizMeta}>
                  {sq.questions.length} Questions • {sq.savedAt}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => {
                  if (Platform.OS === 'web') {
                    if (window.confirm('Are you sure you want to delete this quiz?')) {
                      deleteQuiz(sq.id);
                    }
                  } else {
                    Alert.alert(
                      'Delete Quiz',
                      'Are you sure?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => deleteQuiz(sq.id) },
                      ]
                    );
                  }
                }}>
                <Text style={styles.deleteButtonText}>🗑️</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>📝</Text>
          <Text style={styles.emptyStateText}>No saved quizzes yet</Text>
          <Text style={styles.emptyStateSubtext}>
            Start your learning journey today!
          </Text>
        </View>
      )}
    </Animated.View>
  );

  const renderGenerate = () => (
    <Animated.View style={[styles.contentContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => setScreen('home')}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.pageTitle}>Create Quiz</Text>

      {/* Mode Selection Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, generateMode === 'topic' && styles.activeTab]}
          onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setGenerateMode('topic');
          }}>
          <Text style={[styles.tabText, generateMode === 'topic' && styles.activeTabText]}>
            ✨ By Topic
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, generateMode === 'upload' && styles.activeTab]}
          onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setGenerateMode('upload');
          }}>
          <Text style={[styles.tabText, generateMode === 'upload' && styles.activeTabText]}>
            📄 Upload File
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        {generateMode === 'topic' ? (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Topic</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Quantum Physics, French History"
              placeholderTextColor="#999"
              value={topic}
              onChangeText={setTopic}
            />
          </View>
        ) : (
          <View style={styles.uploadSection}>
            <Text style={styles.cardTitle}>Upload Documents</Text>
            <Text style={styles.cardSubtitle}>
              Generate a quiz from your text files (Max 10MB, .txt only)
            </Text>
            
            <TouchableOpacity
              style={styles.outlineButton}
              onPress={pickDocument}>
              <Text style={styles.outlineButtonText}>Choose Files</Text>
            </TouchableOpacity>

            {selectedFiles.length > 0 && (
              <View style={styles.fileList}>
                {selectedFiles.map((file, index) => (
                  <View key={index} style={styles.fileChip}>
                    <Text style={styles.fileName} numberOfLines={1}>
                      {file.name}
                    </Text>
                    <TouchableOpacity onPress={() => removeFile(index)}>
                      <Text style={styles.fileRemove}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={styles.divider} />

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Questions</Text>
          <View style={styles.segmentContainer}>
            {['3', '5', '10'].map((num) => (
              <TouchableOpacity
                key={num}
                style={[
                  styles.segmentButton,
                  numQuestions === num && styles.segmentButtonActive,
                ]}
                onPress={() => setNumQuestions(num)}>
                <Text
                  style={[
                    styles.segmentButtonText,
                    numQuestions === num && styles.segmentButtonTextActive,
                  ]}>
                  {num}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Difficulty</Text>
          <View style={styles.segmentContainer}>
            {[
              { level: 'easy', label: 'Easy' },
              { level: 'medium', label: 'Medium' },
              { level: 'hard', label: 'Hard' },
            ].map((item) => (
              <TouchableOpacity
                key={item.level}
                style={[
                  styles.segmentButton,
                  difficulty === item.level && styles.segmentButtonActive,
                ]}
                onPress={() => setDifficulty(item.level)}>
                <Text
                  style={[
                    styles.segmentButtonText,
                    difficulty === item.level && styles.segmentButtonTextActive,
                  ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        activeOpacity={0.8}
        onPress={() => {
          if (generateMode === 'upload') {
            processFilesAndGenerateQuiz();
          } else {
            generateQuiz();
          }
        }}
        disabled={loading}>
        <LinearGradient
          colors={['#8E2DE2', '#4A00E0']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientButton}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {generateMode === 'upload' ? '✨ Generate from File' : '✨ Generate Quiz'}
            </Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderQuiz = () => {
    if (!quiz) return null;

    const question = quiz.questions[currentQuestion];
    const progress = ((currentQuestion + 1) / quiz.questions.length) * 100;
    const isAnswered = userAnswers[currentQuestion] !== undefined;

    return (
      <Animated.View style={[styles.contentContainer, { opacity: fadeAnim }]}>
        <View style={styles.quizHeader}>
          <View style={styles.quizHeaderTop}>
            <Text style={styles.quizTitle} numberOfLines={1}>{quiz.title}</Text>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={saveQuiz}>
              <Text style={styles.iconButtonText}>💾</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              {currentQuestion + 1} / {quiz.questions.length}
            </Text>
            <View style={styles.progressBarBg}>
              <Animated.View 
                style={[
                  styles.progressBarFill, 
                  { 
                    width: '100%',
                    transform: [{ translateX: -100 + progress }] // Simple animation hack or use width interpolation
                  } 
                ]} 
              >
                 <View style={{ width: `${progress}%`, height: '100%', backgroundColor: '#4299e1' }} />
              </Animated.View>
              <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
            </View>
          </View>
        </View>

        <ScrollView 
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
            <Text style={styles.questionText}>{question.question}</Text>

            <View style={styles.optionsList}>
              {question.options.map((option, index) => {
                const isSelected = userAnswers[currentQuestion] === index;
                return (
                  <TouchableOpacity
                    key={index}
                    activeOpacity={0.7}
                    style={[
                      styles.optionCard,
                      isSelected && styles.optionCardSelected,
                    ]}
                    onPress={() => selectAnswer(index)}>
                    <View style={[styles.optionIndicator, isSelected && styles.optionIndicatorSelected]}>
                      <Text style={[styles.optionIndicatorText, isSelected && styles.optionIndicatorTextSelected]}>
                        {String.fromCharCode(65 + index)}
                      </Text>
                    </View>
                    <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.navButton, currentQuestion === 0 && styles.disabledButton]}
            onPress={previousQuestion}
            disabled={currentQuestion === 0}>
            <Text style={styles.navButtonText}>Previous</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navButton, styles.nextButton, !isAnswered && styles.disabledButton]}
            onPress={nextQuestion}
            disabled={!isAnswered}>
            <Text style={[styles.navButtonText, styles.nextButtonText]}>
              {currentQuestion === quiz.questions.length - 1 ? 'Finish' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  const renderResults = () => {
    if (!quiz) return null;

    const correctCount = userAnswers.reduce((count, answer, index) => {
      return answer === quiz.questions[index].correctAnswer ? count + 1 : count;
    }, 0);

    const percentage = Math.round((correctCount / quiz.questions.length) * 100);
    
    let emoji = '🎉';
    let message = 'Outstanding!';
    if (percentage < 50) {
      emoji = '📚';
      message = 'Keep Learning!';
    } else if (percentage < 80) {
      emoji = '👍';
      message = 'Good Job!';
    }

    return (
      <Animated.View style={[styles.contentContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsEmoji}>{emoji}</Text>
            <Text style={styles.resultsMessage}>{message}</Text>
            <View style={styles.scoreCard}>
              <Text style={styles.scoreText}>{percentage}%</Text>
              <Text style={styles.scoreSubtext}>
                {correctCount} / {quiz.questions.length} Correct
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Review</Text>
          
          {quiz.questions.map((question, index) => {
            const isCorrect = userAnswers[index] === question.correctAnswer;
            const userAnswer = question.options[userAnswers[index]];
            const correctAnswer = question.options[question.correctAnswer];

            return (
              <View key={index} style={styles.card}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewIndex}>Q{index + 1}</Text>
                  <View style={[styles.badge, isCorrect ? styles.badgeSuccess : styles.badgeError]}>
                    <Text style={[styles.badgeText, isCorrect ? styles.badgeTextSuccess : styles.badgeTextError]}>
                      {isCorrect ? 'Correct' : 'Incorrect'}
                    </Text>
                  </View>
                </View>
                
                <Text style={styles.reviewQuestion}>{question.question}</Text>
                
                <View style={styles.reviewAnswerBox}>
                  <Text style={styles.reviewLabel}>Your Answer:</Text>
                  <Text style={[styles.reviewValue, isCorrect ? styles.textSuccess : styles.textError]}>
                    {userAnswer}
                  </Text>
                </View>
                
                {!isCorrect && (
                  <View style={styles.reviewAnswerBox}>
                    <Text style={styles.reviewLabel}>Correct Answer:</Text>
                    <Text style={[styles.reviewValue, styles.textSuccess]}>
                      {correctAnswer}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.outlineButton}
              onPress={saveQuiz}>
              <Text style={styles.outlineButtonText}>💾 Save to Library</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => {
                setScreen('home');
                setTopic('');
                setQuiz(null);
                setUserAnswers([]);
              }}>
              <LinearGradient
                colors={['#11998e', '#38ef7d']}
                style={styles.gradientButton}>
                <Text style={styles.buttonText}>🏠 Home</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.outlineButton}
              onPress={() => {
                setCurrentQuestion(0);
                setUserAnswers([]);
                setScreen('quiz');
              }}>
              <Text style={styles.outlineButtonText}>🔄 Retry Quiz</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Animated.View>
    );
  };

  return (
    <LinearGradient
      colors={['#f6f9fc', '#eef2f3']}
      style={styles.mainContainer}>
      <ExpoStatusBar style="dark" />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          {screen === 'home' && renderHome()}
          {screen === 'generate' && renderGenerate()}
          {screen === 'quiz' && renderQuiz()}
          {screen === 'results' && renderResults()}
        </ScrollView>
        {toast && (
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onHide={() => setToast(null)} 
          />
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    padding: 20,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 50,
  },
  logoContainer: {
    width: 100,
    height: 100,
    backgroundColor: '#fff',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  logo: {
    fontSize: 50,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1a202c',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#718096',
    fontWeight: '500',
  },
  primaryButton: {
    marginBottom: 20,
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  gradientButton: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2d3748',
    marginBottom: 15,
    marginTop: 10,
  },
  savedQuizItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  savedQuizContent: {
    flex: 1,
  },
  savedQuizTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 4,
  },
  savedQuizMeta: {
    fontSize: 13,
    color: '#a0aec0',
    fontWeight: '500',
  },
  deleteButton: {
    padding: 10,
    backgroundColor: '#FED7D7',
    borderRadius: 10,
    marginLeft: 10,
  },
  deleteButtonText: {
    fontSize: 16,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 60,
    opacity: 0.6,
  },
  emptyStateIcon: {
    fontSize: 60,
    marginBottom: 15,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4a5568',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#718096',
    marginTop: 5,
  },
  backButton: {
    marginBottom: 20,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  backButtonText: {
    color: '#4a5568',
    fontWeight: '600',
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1a202c',
    marginBottom: 25,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 15,
    padding: 4,
    marginBottom: 25,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#718096',
  },
  activeTabText: {
    color: '#2d3748',
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#718096',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#f7fafc',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    fontSize: 16,
    color: '#2d3748',
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#f7fafc',
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentButtonActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  segmentButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#718096',
  },
  segmentButtonTextActive: {
    color: '#4a5568',
    fontWeight: '700',
  },
  uploadSection: {
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2d3748',
    marginBottom: 5,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 15,
  },
  outlineButton: {
    paddingVertical: 15,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4299e1',
    alignItems: 'center',
    marginBottom: 10,
  },
  outlineButtonText: {
    color: '#4299e1',
    fontSize: 16,
    fontWeight: '700',
  },
  fileList: {
    marginTop: 10,
  },
  fileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7fafc',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  fileName: {
    flex: 1,
    fontSize: 14,
    color: '#4a5568',
  },
  fileRemove: {
    fontSize: 20,
    color: '#e53e3e',
    fontWeight: '700',
    marginLeft: 10,
    paddingHorizontal: 5,
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 20,
  },
  quizHeader: {
    marginBottom: 20,
  },
  quizHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  quizTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2d3748',
    flex: 1,
    marginRight: 10,
  },
  iconButton: {
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  iconButtonText: {
    fontSize: 20,
  },
  progressContainer: {
    marginBottom: 10,
  },
  progressText: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 8,
    fontWeight: '600',
  },
  progressBarBg: {
    height: 10,
    backgroundColor: '#e2e8f0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4299e1',
    borderRadius: 5,
  },
  questionText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 25,
    lineHeight: 30,
  },
  optionsList: {
    gap: 15,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7fafc',
    padding: 16,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardSelected: {
    backgroundColor: '#ebf8ff',
    borderColor: '#4299e1',
  },
  optionIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
    borderWidth: 1,
    borderColor: '#cbd5e0',
  },
  optionIndicatorSelected: {
    backgroundColor: '#4299e1',
    borderColor: '#4299e1',
  },
  optionIndicatorText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#718096',
  },
  optionIndicatorTextSelected: {
    color: '#fff',
  },
  optionText: {
    fontSize: 16,
    color: '#4a5568',
    flex: 1,
    lineHeight: 22,
  },
  optionTextSelected: {
    color: '#2b6cb0',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    gap: 15,
    paddingTop: 20,
  },
  navButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 15,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e0',
  },
  nextButton: {
    backgroundColor: '#4299e1',
    borderColor: '#4299e1',
  },
  disabledButton: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4a5568',
  },
  nextButtonText: {
    color: '#fff',
  },
  resultsHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  resultsEmoji: {
    fontSize: 80,
    marginBottom: 10,
  },
  resultsMessage: {
    fontSize: 28,
    fontWeight: '800',
    color: '#2d3748',
    marginBottom: 20,
  },
  scoreCard: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 25,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  scoreText: {
    fontSize: 64,
    fontWeight: '800',
    color: '#4299e1',
    marginBottom: 5,
  },
  scoreSubtext: {
    fontSize: 16,
    color: '#718096',
    fontWeight: '500',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  reviewIndex: {
    fontSize: 14,
    fontWeight: '700',
    color: '#a0aec0',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgeSuccess: {
    backgroundColor: '#c6f6d5',
  },
  badgeError: {
    backgroundColor: '#fed7d7',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  badgeTextSuccess: {
    color: '#2f855a',
  },
  badgeTextError: {
    color: '#c53030',
  },
  reviewQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 15,
    lineHeight: 24,
  },
  reviewAnswerBox: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  reviewLabel: {
    width: 120,
    fontSize: 14,
    color: '#718096',
    fontWeight: '600',
  },
  reviewValue: {
    flex: 1,
    fontSize: 14,
    color: '#2d3748',
  },
  textSuccess: {
    color: '#38a169',
    fontWeight: '600',
  },
  textError: {
    color: '#e53e3e',
    fontWeight: '600',
  },
  actionButtons: {
    marginTop: 20,
    gap: 15,
  },
  toast: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 1000,
  },
  toastIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  toastText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
});