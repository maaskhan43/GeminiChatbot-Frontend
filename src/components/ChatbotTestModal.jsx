import React, { useState, useEffect, useRef } from 'react';
import { clientsAPI } from '../api/clients';
import './ChatbotTestModal.css';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

const ChatbotTestModal = ({ isOpen, onClose }) => {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const messagesEndRef = useRef(null);
  const typingIntervalRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      fetchClients();
      setMessages([]);
      setSelectedClient('');
      setIsTesting(false);
      setInputMessage('');
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && !sessionId) {
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(newSessionId);
      console.log(`[SESSION] Generated new session ID: ${newSessionId}`);
    }
  }, [isOpen, sessionId]);

  useEffect(() => {
    if (!isOpen) {
      setMessages([]);
      setInputMessage('');
      setSessionId('');
      setIsLoading(false);
    }
  }, [isOpen]);

  // Cleanup any running typewriter interval when component unmounts
  useEffect(() => {
    return () => {
      if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
    };
  }, []);

  // Helper: type bot message word by word
  const typeBotMessage = (fullText = '', extras = {}) => {
    const text = typeof fullText === 'string' ? fullText : String(fullText || '');
    const words = text.split(' ');
    const speed = 100; // ms per word

    // Push an empty bot message first (with any extra fields)
    setMessages(prev => [...prev, { sender: 'bot', text: '', ...extras }]);

    let wordIndex = 0;
    return new Promise(resolve => {
      if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);

      typingIntervalRef.current = setInterval(() => {
        wordIndex += 1;
        const currentText = words.slice(0, wordIndex).join(' ');

        setMessages(prev => {
          const next = [...prev];
          const lastIndex = next.length - 1;
          if (lastIndex >= 0) {
            next[lastIndex] = { ...next[lastIndex], text: currentText };
          }
          return next;
        });

        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

        if (wordIndex >= words.length) {
          clearInterval(typingIntervalRef.current);
          typingIntervalRef.current = null;
          resolve();
        }
      }, speed);
    });
  };

  const fetchClients = async () => {
    try {
      const response = await clientsAPI.getClients();
      if (response.success) {
        setClients(response.clients || []);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const startTesting = () => {
    if (!selectedClient) {
      alert('Please select a client to test');
      return;
    }
    const client = clients.find(c => c._id === selectedClient);
    setIsTesting(true);
    setMessages([
      {
        sender: 'bot',
        text: `Hello! I'm the chatbot for ${client.name}. Ask me anything!`,
      }
    ]);
  };

  const sendMessage = async (messageText = null, skipRefinement = false) => {
    const textToSend = messageText || inputMessage.trim();
    if (!textToSend || isLoading) return;

    const userMessage = {
      sender: 'user',
      text: textToSend,
    };

    setMessages(prev => [...prev, userMessage]);
    if (!messageText) setInputMessage('');
    setIsLoading(true);

    try {
      const response = await clientsAPI.semanticSearch(textToSend, selectedClient, sessionId, skipRefinement);
      const botMessage = { 
        sender: 'bot', 
        text: response.answer,
        suggestedQuestions: response.suggestions || response.suggestedQuestions || null,
        followUpQuestions: response.followUpQuestions || null,
        completenessScore: response.completenessScore || null
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        response: error.response,
        request: error.request
      });
      
      // Check if it's a network error or API response error
      let errorText = 'Sorry, I encountered an error. Please try again.';
      
      if (error.response) {
        // Server responded with error status
        const status = error.response.status;
        const data = error.response.data;
        
        console.log('Server error response:', { status, data });
        
        if (status === 503) {
          errorText = 'The AI service is temporarily overloaded. Please try again in a moment.';
        } else if (status === 429) {
          errorText = 'Too many requests. Please wait a moment before trying again.';
        } else if (data && data.message) {
          errorText = `Error: ${data.message}`;
        } else {
          errorText = `Server error (${status}). Please try again.`;
        }
      } else if (error.request) {
        // Network error - no response received
        console.log('Network error - no response received:', error.request);
        errorText = 'Unable to connect to the server. Please check your connection and try again.';
      } else if (error.message) {
        // Custom error message (like from API client)
        if (error.message.includes('Network error')) {
          errorText = 'Network connection failed. Please check if the backend server is running.';
        } else {
          errorText = `Error: ${error.message}`;
        }
      }
      
      const errorMessage = {
        sender: 'bot',
        text: errorText,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestedQuestionClick = async (suggestion) => {
    if (isLoading) return;
    
    // Handle both old string format and new object format
    const questionText = typeof suggestion === 'string' ? suggestion : suggestion.question;

    // Directly send the message, skipping refinement
    await sendMessage(questionText, true);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const resetTesting = () => {
    setIsTesting(false);
    setMessages([]);
    setInputMessage('');
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="chatbot-test-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>🤖 Chatbot Testing</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          {!isTesting ? (
            <div className="client-selection">
              <h4>Select a client to test:</h4>
              <select 
                value={selectedClient} 
                onChange={(e) => setSelectedClient(e.target.value)}
              >
                <option value="">Choose a client...</option>
                {clients.map(client => (
                  <option key={client._id} value={client._id}>
                    {client.name}
                  </option>
                ))}
              </select>
              <button 
                className="start-btn" 
                onClick={startTesting}
                disabled={!selectedClient}
              >
                Start Testing
              </button>
            </div>
          ) : (
            <div className="chat-interface">
              <div className="chat-header">
                 <button className="reset-btn" onClick={resetTesting}>
                  ← Back to Selection
                </button>
              </div>  
              <div className="messages-container">
                {messages.map((message, index) => (
                  <div key={index} className={`message ${message.sender}`}>
                    <div className="message-content">
                      {message.text}
                      {message.suggestedQuestions && message.suggestedQuestions.length > 0 && (
                        <div className="suggested-questions">
                          <p className="suggestions-label">Try asking:</p>
                          {message.suggestedQuestions.map((suggestion, qIndex) => (
                            <button
                              key={suggestion.id || qIndex}
                              className="suggested-question-btn"
                              onClick={() => handleSuggestedQuestionClick(suggestion)}
                              disabled={isLoading}
                              title={typeof suggestion === 'object' ? `Relevance: ${suggestion.relevanceReason} (Score: ${suggestion.score})` : ''}
                            >
                              {typeof suggestion === 'string' ? suggestion : suggestion.question}
                            </button>
                          ))}
                        </div>
                      )}
                      {message.followUpQuestions && message.followUpQuestions.length > 0 && (
                        <div className="follow-up-questions">
                          <p className="follow-up-label">Follow-up questions:</p>
                          {message.followUpQuestions.map((question, qIndex) => (
                            <button
                              key={qIndex}
                              className="follow-up-question-btn"
                              onClick={() => handleSuggestedQuestionClick(question)}
                              disabled={isLoading}
                            >
                              {question}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="message bot">
                    <div className="message-content">
                      <div className="typing-indicator"><span></span><span></span><span></span></div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              <div className="message-input-container">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  rows="1"
                  disabled={isLoading}
                />
                <button 
                  className="send-btn" 
                  onClick={sendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                >
                  &#10148;
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatbotTestModal;
