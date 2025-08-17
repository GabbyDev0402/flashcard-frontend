import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowLeft, RotateCcw, CheckCircle, XCircle, Clock, Target, TrendingUp, Settings } from 'lucide-react';
import './App.css';

const BASE_API_URL = import.meta.env.VITE_BASE_API_URL || 'http://localhost:5000/api/cards';

function App() {
  // Main app state
  const [view, setView] = useState('home'); // 'home', 'study', 'complete', 'setup'
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Study session setup state
  const [selectedSubject, setSelectedSubject] = useState('');
  const [cardLimit, setCardLimit] = useState(20);
  const [availableCards, setAvailableCards] = useState([]);

  // Study session state
  const [currentSubject, setCurrentSubject] = useState('');
  const [cards, setCards] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    correct: 0,
    incorrect: 0,
    total: 0
  });
  const [againCards, setAgainCards] = useState([]);

  // Fetch all cards and calculate subject counts on initial load
  useEffect(() => {
    fetchAllCards();
  }, []);

  const fetchAllCards = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(BASE_API_URL);
      
      if (response.data.success) {
        const allCards = response.data.data;
        
        // Calculate subject counts
        const subjectCounts = {};
        allCards.forEach(card => {
          subjectCounts[card.subject] = (subjectCounts[card.subject] || 0) + 1;
        });

        // Convert to array format for rendering
        const subjectsArray = Object.entries(subjectCounts).map(([subject, count]) => ({
          name: subject,
          count: count
        }));

        setSubjects(subjectsArray);
      } else {
        throw new Error(response.data.message || 'Failed to fetch cards');
      }
    } catch (err) {
      console.error('Error fetching cards:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load cards');
    } finally {
      setLoading(false);
    }
  };

  const fetchCardsBySubject = async (subject) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(`${BASE_API_URL}?subject=${encodeURIComponent(subject)}`);
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch cards for subject');
      }
    } catch (err) {
      console.error('Error fetching cards by subject:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load cards for this subject');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const setupStudySession = async (subject) => {
    const subjectCards = await fetchCardsBySubject(subject);
    
    if (subjectCards.length === 0) {
      setError(`No cards found for subject: ${subject}`);
      return;
    }

    setSelectedSubject(subject);
    setAvailableCards(subjectCards);
    setCardLimit(Math.min(20, subjectCards.length)); // Default to 20 or max available
    setView('setup');
  };

  const startStudySession = () => {
    if (availableCards.length === 0) return;

    // Shuffle cards and take the specified limit
    const shuffledCards = [...availableCards].sort(() => Math.random() - 0.5);
    const sessionCards = shuffledCards.slice(0, cardLimit);

    setCurrentSubject(selectedSubject);
    setCards(sessionCards);
    setCurrentCardIndex(0);
    setSelectedChoice('');
    setShowResult(false);
    setSessionStats({ correct: 0, incorrect: 0, total: sessionCards.length });
    setAgainCards([]);
    setView('study');
  };

  const selectChoice = (choice) => {
    if (showResult) return;
    setSelectedChoice(choice);
  };

  const submitAnswer = () => {
    if (!selectedChoice) return;
    
    setShowResult(true);
    const currentCard = cards[currentCardIndex];
    const isCorrect = selectedChoice === currentCard.answer;
    
    if (isCorrect) {
      setSessionStats(prev => ({ ...prev, correct: prev.correct + 1 }));
    } else {
      setSessionStats(prev => ({ ...prev, incorrect: prev.incorrect + 1 }));
      // Add to "again" cards for review
      if (!againCards.find(card => card._id === currentCard._id)) {
        setAgainCards(prev => [...prev, currentCard]);
      }
    }
  };

  const nextCard = () => {
    if (currentCardIndex < cards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setSelectedChoice('');
      setShowResult(false);
    } else {
      setView('complete');
    }
  };

  const studyAgainCards = () => {
    if (againCards.length > 0) {
      setCards(againCards);
      setCurrentCardIndex(0);
      setSelectedChoice('');
      setShowResult(false);
      setSessionStats({ 
        correct: 0, 
        incorrect: 0, 
        total: againCards.length 
      });
      setAgainCards([]);
      setView('study');
    }
  };

  const restartSession = () => {
    startStudySession();
  };

  const goHome = () => {
    setView('home');
    setCurrentSubject('');
    setSelectedSubject('');
    setCards([]);
    setAvailableCards([]);
    setCurrentCardIndex(0);
    setSelectedChoice('');
    setShowResult(false);
    setSessionStats({ correct: 0, incorrect: 0, total: 0 });
    setAgainCards([]);
    setCardLimit(20);
    // Refresh subject counts
    fetchAllCards();
  };

  const goBackToHome = () => {
    setView('home');
    setSelectedSubject('');
    setAvailableCards([]);
    setCardLimit(20);
  };

  const currentCard = cards[currentCardIndex];

  // Common limit options
  const limitOptions = [5, 10, 15, 20, 25, 30, 50];

  // Loading state
  if (loading && view === 'home') {
    return (
      <div className="app">
        <div className="container">
          <div className="loading">
            <Clock size={48} />
            <p>Loading flashcards...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && view === 'home') {
    return (
      <div className="app">
        <div className="container">
          <div className="error">
            <XCircle size={48} />
            <h3>Error Loading Cards</h3>
            <p>{error}</p>
            <button className="retry-button" onClick={fetchAllCards}>
              <RotateCcw size={16} />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="container">
        {view === 'home' && (
          <>
            <div className="logo">
              <svg width="60" height="60" viewBox="0 0 60 60" style={{marginRight: '15px', verticalAlign: 'middle'}}>
                <rect x="5" y="10" width="50" height="35" rx="8" fill="none" stroke="url(#grad1)" strokeWidth="3"/>
                <rect x="10" y="15" width="40" height="25" rx="5" fill="url(#grad2)"/>
                <circle cx="20" cy="25" r="3" fill="white"/>
                <rect x="28" y="23" width="15" height="4" fill="white" rx="2"/>
                <rect x="15" y="32" width="25" height="2" fill="white" rx="1"/>
                <defs>
                  <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#667eea"/>
                    <stop offset="100%" stopColor="#764ba2"/>
                  </linearGradient>
                  <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#667eea" stopOpacity="0.8"/>
                    <stop offset="100%" stopColor="#764ba2" stopOpacity="0.8"/>
                  </linearGradient>
                </defs>
              </svg>
              LET Reviewer
            </div>
            <p className="tagline">Master your knowledge with interactive flashcards</p>
            
            {subjects.length === 0 ? (
              <div className="error">
                <p>No flashcards available. Please add some cards to your database first.</p>
                <button className="retry-button" onClick={fetchAllCards}>
                  <RotateCcw size={16} />
                  Refresh
                </button>
              </div>
            ) : (
              <div className="subjects-grid">
                {subjects.map((subject, index) => (
                  <button
                    key={subject.name}
                    className="subject-card"
                    onClick={() => setupStudySession(subject.name)}
                  >
                    <h3>{subject.name}</h3>
                    <p className="card-count">{subject.count} cards</p>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {view === 'setup' && (
          <div className="study-setup">
            <div className="setup-header">
              <button className="back-button" onClick={goBackToHome}>
                <ArrowLeft size={20} />
                Back to Subjects
              </button>
              <div className="setup-title">
                <Settings size={24} />
                <h2>Setup Study Session</h2>
              </div>
            </div>

            <div className="setup-content">
              <div className="setup-section">
                <h3>Subject</h3>
                <div className="selected-subject">
                  <div className="subject-info">
                    <h4>{selectedSubject}</h4>
                    <p>{availableCards.length} cards available</p>
                  </div>
                </div>
              </div>

              <div className="setup-section">
                <h3>Number of Cards to Study</h3>
                <div className="limit-options">
                  {limitOptions
                    .filter(option => option <= availableCards.length)
                    .map(option => (
                      <button
                        key={option}
                        className={`limit-option ${cardLimit === option ? 'selected' : ''}`}
                        onClick={() => setCardLimit(option)}
                      >
                        {option}
                      </button>
                    ))}
                  {!limitOptions.includes(availableCards.length) && availableCards.length <= 100 && (
                    <button
                      className={`limit-option ${cardLimit === availableCards.length ? 'selected' : ''}`}
                      onClick={() => setCardLimit(availableCards.length)}
                    >
                      All ({availableCards.length})
                    </button>
                  )}
                </div>

                <div className="custom-limit">
                  <label>
                    Custom limit:
                    <input
                      type="number"
                      min="1"
                      max={availableCards.length}
                      value={cardLimit}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 1;
                        setCardLimit(Math.min(Math.max(value, 1), availableCards.length));
                      }}
                      className="custom-limit-input"
                    />
                  </label>
                  <span className="limit-info">Max: {availableCards.length}</span>
                </div>
              </div>

              <div className="setup-summary">
                <div className="summary-card">
                  <h4>Session Summary</h4>
                  <p><strong>Subject:</strong> {selectedSubject}</p>
                  <p><strong>Cards to study:</strong> {cardLimit} out of {availableCards.length}</p>
                  <p><strong>Estimated time:</strong> ~{Math.ceil(cardLimit * 0.5)} minutes</p>
                </div>
              </div>

              <div className="setup-actions">
                <button className="btn btn-primary btn-large" onClick={startStudySession}>
                  <Target size={20} />
                  Start Study Session
                </button>
              </div>
            </div>
          </div>
        )}

        {view === 'study' && currentCard && (
          <div className="study-view">
            <div className="study-header">
              <button className="back-button" onClick={goHome}>
                <ArrowLeft size={20} />
                Back to Subjects
              </button>
              <div className="progress-info">
                <h2>{currentSubject}</h2>
                <p>Question {currentCardIndex + 1} of {cards.length}</p>
                <p>Score: {sessionStats.correct}/{currentCardIndex + (showResult ? 1 : 0)}</p>
              </div>
            </div>

            <div className="flashcard">
              <div className="question">{currentCard.question}</div>
              <ul className="choices">
                {currentCard.choices.map((choice, index) => (
                  <li
                    key={index}
                    className={`choice ${
                      selectedChoice === choice ? 'selected' : ''
                    } ${
                      showResult
                        ? choice === currentCard.answer
                          ? 'correct'
                          : selectedChoice === choice && choice !== currentCard.answer
                          ? 'incorrect'
                          : ''
                        : ''
                    }`}
                    onClick={() => selectChoice(choice)}
                  >
                    {choice}
                  </li>
                ))}
              </ul>
            </div>

            <div className="actions">
              {!showResult ? (
                <button 
                  className="btn btn-primary" 
                  onClick={submitAnswer}
                  disabled={!selectedChoice}
                >
                  <CheckCircle size={20} />
                  Submit Answer
                </button>
              ) : (
                <button className="btn btn-success" onClick={nextCard}>
                  {currentCardIndex < cards.length - 1 ? (
                    <>
                      Next Question
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9,18 15,12 9,6"></polyline>
                      </svg>
                    </>
                  ) : (
                    <>
                      Complete Session
                      <CheckCircle size={20} />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {view === 'complete' && (
          <div className="session-complete">
            <h2>
              <CheckCircle size={60} style={{verticalAlign: 'middle', marginRight: '10px', color: '#28a745'}} />
              Session Complete!
            </h2>
            
            <div className="stats">
              <div className="stat-card">
                <div className="stat-number">{sessionStats.correct}</div>
                <div className="stat-label">Correct</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{sessionStats.incorrect}</div>
                <div className="stat-label">Incorrect</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{Math.round((sessionStats.correct / sessionStats.total) * 100)}%</div>
                <div className="stat-label">Accuracy</div>
              </div>
            </div>

            <div className="actions">
              <button className="btn btn-primary" onClick={goHome}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9,22 9,12 15,12 15,22"></polyline>
                </svg>
                Back to Home
              </button>
              
              <button className="btn btn-secondary" onClick={restartSession}>
                <RotateCcw size={20} />
                Restart Session
              </button>
              
              {againCards.length > 0 && (
                <button className="btn btn-warning" onClick={studyAgainCards}>
                  <Target size={20} />
                  Study Incorrect ({againCards.length})
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      <footer className="app-footer">
        GabbyDev 2025
      </footer>
    </div>
  );
}

export default App;