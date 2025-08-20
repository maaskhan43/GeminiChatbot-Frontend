(function() {
  'use strict';

  // Chatbot Widget Class
  function GeminiChatbotWidget(config) {
    this.config = {
      clientId: config.clientId,
      apiUrl: config.apiUrl || 'http://localhost:8080',
      theme: {
        primaryColor: config.theme?.primaryColor || '#007bff',
        position: config.theme?.position || 'bottom-right',
        size: config.theme?.size || 'medium'
      }
    };
    
    this.isOpen = false;
    this.messages = [];
    this.sessionId = this.generateSessionId();
    this.isLoading = false;
    this.isAuthenticated = false;
    this.authToken = localStorage.getItem('chatbot_auth_token');
    this.userEmail = localStorage.getItem('chatbot_user_email');
    this.currentView = 'chat'; // 'chat', 'history', or 'session'
    this.currentSessionData = null; // Store current session data for session view
    this.cachedHistoryData = null; // Cache for chat history
    
    this.init();
  }

  GeminiChatbotWidget.prototype.generateSessionId = function() {
    return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  GeminiChatbotWidget.prototype.init = function() {
    this.createWidget();
    this.attachEventListeners();
    this.checkAuthStatus();
  }

  GeminiChatbotWidget.prototype.checkAuthStatus = function() {
    if (this.authToken) {
      // Verify token with backend
      fetch(`${this.config.apiUrl}/api/auth/verify-token`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          this.isAuthenticated = true;
          this.userEmail = data.user.email;
          localStorage.setItem('chatbot_user_email', this.userEmail);
          // Update UI header with email when authentication is verified
          document.getElementById('user-email-header').innerText = this.userEmail;
        } else {
          this.clearAuthData();
        }
      })
      .catch(() => {
        this.clearAuthData();
      });
    }
  }

  GeminiChatbotWidget.prototype.clearAuthData = function() {
    this.isAuthenticated = false;
    this.authToken = null;
    this.userEmail = null;
    localStorage.removeItem('chatbot_auth_token');
    localStorage.removeItem('chatbot_user_email');
  }

  GeminiChatbotWidget.prototype.createWidget = function() {
    // Create widget container
    this.widgetContainer = document.createElement('div');
    this.widgetContainer.className = 'gemini-chatbot-widget';
    this.widgetContainer.innerHTML = `
      <div class="chatbot-toggle" id="chatbot-toggle">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H5.17L4 17.17V4H20V16Z" fill="white"/>
          <path d="M7 9H17V11H7V9ZM7 12H14V14H7V12Z" fill="white"/>
        </svg>
      </div>
      <div class="chatbot-overlay" id="chatbot-overlay">
        <div class="background-shapes">
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
      </div>
      
      <!-- Authentication Screen -->
      <div class="chatbot-window auth-window" id="auth-window">
        <div class="chatbot-header">
          <h3>🔐 Authentication Required</h3>
          <button class="chatbot-close" id="auth-close" aria-label="Close">&times;</button>
        </div>
        <div class="auth-content">
          <div class="auth-step" id="email-step">
            <h4>Enter your email to continue</h4>
            <p>We'll send you a verification code to access the chatbot.</p>
            <div class="input-group">
              <input type="email" id="auth-email" placeholder="Enter your email address" />
              <button id="send-otp-btn" class="auth-btn">Send Code</button>
            </div>
            <div class="auth-message" id="email-message"></div>
          </div>
          
          <div class="auth-step" id="otp-step" class="hidden">
            <h4>Enter verification code</h4>
            <p>We've sent a 6-digit code to <span id="user-email-display"></span></p>
            <div class="input-group">
              <input type="text" id="auth-otp" placeholder="Enter 6-digit code" maxlength="6" />
              <button id="verify-otp-btn" class="auth-btn">Verify</button>
            </div>
            <div class="auth-message" id="otp-message"></div>
            <button id="resend-otp-btn" class="link-btn">Resend code</button>
          </div>
        </div>
      </div>
      
      <!-- Chat Window -->
      <div class="chatbot-window" id="chatbot-window">
        <div class="chatbot-header">
          <h3>🤖 Chatbot</h3>
          <div class="user-info">
            <span id="user-email-header"></span>
            <button id="history-btn" class="history-btn">📜 History</button>
            <button id="logout-btn" class="logout-btn">Logout</button>
          </div>
          <button class="chatbot-close" id="chatbot-close" aria-label="Close">&times;</button>
        </div>
        
        <!-- This new wrapper is the key to the layout fix -->
        <div class="chat-content-area">
          <div class="chatbot-messages" id="chatbot-messages">
            <div class="message bot-message">
              <div class="message-content">
                <p>Hello! How can I help you today?</p>
              </div>
            </div>
          </div>
          
          <!-- History View -->
          <div class="history-view" id="history-view" style="display: none;">
            <div class="history-header">
              <button id="back-to-chat-btn" class="back-btn">← Back to Chat</button>
              <h4>📜 Chat History</h4>
            </div>
            <div class="history-messages" id="history-messages">
              <div class="loading-history">Loading your chat history...</div>
            </div>
          </div>

          <!-- Session View -->
          <div class="session-view" id="session-view" style="display: none;">
            <div class="session-header">
              <button id="back-to-history-btn" class="back-btn">← Back to History</button>
              <h4 id="session-title">📝 Session Details</h4>
            </div>
            <div class="session-chat-messages" id="session-chat-messages">
              <div class="loading-session">Loading session...</div>
            </div>
          </div>
        </div>
        
        <div class="chatbot-input-area">
          <div class="input-wrapper">
            <input type="text" id="chatbot-input" placeholder="Type your message..." />
            <button id="chatbot-send" class="send-btn" aria-label="Send">
              <span class="send-icon">➤</span>
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.widgetContainer);
  }

  GeminiChatbotWidget.prototype.attachEventListeners = function() {
    const toggle = document.getElementById('chatbot-toggle');
    const close = document.getElementById('chatbot-close');
    const authClose = document.getElementById('auth-close');
    const overlay = document.getElementById('chatbot-overlay');
    const input = document.getElementById('chatbot-input');
    const send = document.getElementById('chatbot-send');

    const sendOtpBtn = document.getElementById('send-otp-btn');
    const verifyOtpBtn = document.getElementById('verify-otp-btn');
    const resendOtpBtn = document.getElementById('resend-otp-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const historyBtn = document.getElementById('history-btn');
    const backToChatBtn = document.getElementById('back-to-chat-btn');
    const backToHistoryBtn = document.getElementById('back-to-history-btn');

    console.log('Attaching event listeners...');
    console.log('Send OTP button found:', !!sendOtpBtn);

    toggle.addEventListener('click', () => this.toggleWidget());
    close.addEventListener('click', () => this.closeWidget());
    authClose.addEventListener('click', () => this.closeAuthWindow());
    overlay.addEventListener('click', () => this.closeWidget());
    send.addEventListener('click', () => this.sendMessage());
    
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.sendMessage();
      }
    });

    if (sendOtpBtn) {
      sendOtpBtn.addEventListener('click', () => {
        console.log('Send OTP button clicked');
        this.sendOtp();
      });
    } else {
      console.error('Send OTP button not found!');
    }

    if (verifyOtpBtn) {
      verifyOtpBtn.addEventListener('click', () => this.verifyOtp());
    }

    if (resendOtpBtn) {
      resendOtpBtn.addEventListener('click', () => this.resendOtp());
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.logout());
    }

    if (historyBtn) {
      historyBtn.addEventListener('click', () => this.showHistory());
    }

    if (backToChatBtn) {
      backToChatBtn.addEventListener('click', () => this.showChat());
    }

    if (backToHistoryBtn) {
      backToHistoryBtn.addEventListener('click', () => this.showHistory());
    }

    // Close on ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeWidget();
    });
  }

  GeminiChatbotWidget.prototype.toggleWidget = function() {
    const chatWindow = document.getElementById('chatbot-window');
    const overlay = document.getElementById('chatbot-overlay');
    const authWindow = document.getElementById('auth-window');

    if (!this.isAuthenticated) {
      authWindow.classList.add('show');
      overlay.classList.add('show');
    } else {
      chatWindow.classList.add('show');
      overlay.classList.add('show');
    }
  }

  GeminiChatbotWidget.prototype.closeWidget = function() {
    const chatWindow = document.getElementById('chatbot-window');
    const authWindow = document.getElementById('auth-window');
    const overlay = document.getElementById('chatbot-overlay');
    
    chatWindow.classList.remove('show');
    authWindow.classList.remove('show');
    overlay.classList.remove('show');
  }

  GeminiChatbotWidget.prototype.closeAuthWindow = function() {
    const authWindow = document.getElementById('auth-window');
    const overlay = document.getElementById('chatbot-overlay');
    authWindow.classList.remove('show');
    overlay.classList.remove('show');
  }

  GeminiChatbotWidget.prototype.sendMessage = function() {
    const input = document.getElementById('chatbot-input');
    const message = input.value.trim();
    
    if (!message || this.isLoading) return;

    // Add user message
    this.addMessage(message, 'user');
    input.value = '';
    this.isLoading = true;

    // Show typing indicator
    this.showTypingIndicator();

    const self = this;
    fetch(`${this.config.apiUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`
      },
      body: JSON.stringify({
        clientId: this.config.clientId,
        query: message,
        sessionId: this.sessionId
      })
    })
    .then(response => response.json())
    .then(data => {
      console.log('Backend response:', data); // Debug log
      
      // Remove typing indicator
      self.hideTypingIndicator();
      
      // Handle backend response format (from semanticSearch)
      if (data.answer) {
        // Always add the main answer first with typewriter effect
        self.addMessageWithTypewriter(data.answer, 'bot');
        
        // Check for suggestions (could be in suggestions, suggestedQuestions, or other fields)
        const suggestions = data.suggestions || data.suggestedQuestions || data.relatedQuestions || [];
        if (suggestions && suggestions.length > 0) {
          // Display suggestions as clickable options after a delay
          setTimeout(() => {
            self.addSuggestions(suggestions);
          }, data.answer.length * 30 + 500); // Delay based on text length
        }
        
        // Check for follow-up questions
        const followUpQuestions = data.followUpQuestions || [];
        if (followUpQuestions && followUpQuestions.length > 0) {
          setTimeout(() => {
            self.addFollowUpQuestions(followUpQuestions);
          }, data.answer.length * 30 + 800);
        }
      } else if (data.success && data.response) {
        // Handle widget-specific success response
        self.addMessageWithTypewriter(data.response, 'bot');
        
        // Check for suggestions in success response (multiple possible field names)
        const suggestions = data.suggestions || data.suggestedQuestions || data.relatedQuestions || 
                           data.recommendedQuestions || data.similarQuestions || [];
        
        if (suggestions && suggestions.length > 0) {
          setTimeout(() => {
            self.addSuggestions(suggestions);
          }, data.response.length * 30 + 500);
        } else {
          // If no suggestions provided but response indicates "related topics", 
          // show a message that suggestions should be available
          if (data.response && (data.response.includes('संबंधित विषय') || 
                               data.response.includes('related topics') || 
                               data.response.includes('might help'))) {
            setTimeout(() => {
              self.addMessage('The system should show suggested questions here, but they are not being returned by the backend.', 'bot');
            }, data.response.length * 30 + 500);
          }
        }
        
        // Check for follow-up questions
        if (data.followUpQuestions && data.followUpQuestions.length > 0) {
          setTimeout(() => {
            self.addFollowUpQuestions(data.followUpQuestions);
          }, data.response.length * 30 + 800);
        }
      } else {
        self.addMessageWithTypewriter('Sorry, I encountered an error. Please try again.', 'bot');
      }
    })
    .catch(error => {
      console.error('Chatbot error:', error);
      self.hideTypingIndicator();
      self.addMessageWithTypewriter('Sorry, I\'m having trouble connecting. Please try again later.', 'bot');
    })
    .finally(() => {
      self.isLoading = false;
    });
  }

  GeminiChatbotWidget.prototype.sendOtp = function() {
    const emailInput = document.getElementById('auth-email');
    const sendBtn = document.getElementById('send-otp-btn');
    const messageDiv = document.getElementById('email-message');
    const email = emailInput.value.trim();

    console.log('Send OTP clicked, email:', email);

    if (!email) {
      messageDiv.innerText = 'Please enter your email address';
      messageDiv.style.color = '#dc3545';
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      messageDiv.innerText = 'Please enter a valid email address';
      messageDiv.style.color = '#dc3545';
      return;
    }

    // Disable button and show loading
    sendBtn.disabled = true;
    sendBtn.innerText = 'Sending...';
    messageDiv.innerText = '';

    const self = this;
    console.log('Making API call to:', `${this.config.apiUrl}/api/auth/send-otp`);

    fetch(`${this.config.apiUrl}/api/auth/send-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email
      })
    })
    .then(response => {
      console.log('Response status:', response.status);
      return response.json();
    })
    .then(data => {
      console.log('Response data:', data);
      
      sendBtn.disabled = false;
      sendBtn.innerText = 'Send Code';
      
      if (data.success) {
        document.getElementById('email-step').classList.add('hidden');
        document.getElementById('otp-step').classList.add('show');
        document.getElementById('user-email-display').innerText = email;
        messageDiv.innerText = '';
      } else {
        messageDiv.innerText = data.message || 'Failed to send OTP. Please try again.';
        messageDiv.style.color = '#dc3545';
      }
    })
    .catch(error => {
      console.error('Error sending OTP:', error);
      sendBtn.disabled = false;
      sendBtn.innerText = 'Send Code';
      messageDiv.innerText = 'Network error. Please check your connection and try again.';
      messageDiv.style.color = '#dc3545';
    });
  }

  GeminiChatbotWidget.prototype.verifyOtp = function() {
    const otpInput = document.getElementById('auth-otp');
    const emailInput = document.getElementById('auth-email');
    const otp = otpInput.value.trim();
    const email = emailInput.value.trim();

    if (!otp || !email) return;

    const self = this;
    fetch(`${this.config.apiUrl}/api/auth/verify-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        otp: otp,
        clientId: this.config.clientId
      })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        self.authToken = data.token;
        self.userEmail = data.user.email;
        self.isAuthenticated = true;
        localStorage.setItem('chatbot_auth_token', self.authToken);
        localStorage.setItem('chatbot_user_email', self.userEmail);
        
        // Update UI and switch to chat
        document.getElementById('user-email-header').innerText = self.userEmail;
        self.closeAuthWindow();
        self.toggleWidget();
      } else {
        document.getElementById('otp-message').innerText = data.message || 'Invalid OTP. Please try again.';
      }
    })
    .catch(error => {
      console.error('Error verifying OTP:', error);
      document.getElementById('otp-message').innerText = 'Verification failed. Please try again.';
    });
  }

  GeminiChatbotWidget.prototype.resendOtp = function() {
    const emailInput = document.getElementById('auth-email');
    const email = emailInput.value.trim();

    if (!email) return;

    const self = this;
    fetch(`${this.config.apiUrl}/api/auth/resend-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email
      })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        document.getElementById('otp-message').innerText = 'OTP resent successfully.';
      } else {
        document.getElementById('otp-message').innerText = 'Failed to resend OTP. Please try again.';
      }
    })
    .catch(error => {
      console.error('Error resending OTP:', error);
      document.getElementById('otp-message').innerText = 'Failed to resend OTP. Please try again.';
    });
  }

  GeminiChatbotWidget.prototype.logout = function() {
    this.clearAuthData();
    this.closeWidget();
  }

  GeminiChatbotWidget.prototype.addMessage = function(content, sender, followUpQuestions = []) {
    const messagesContainer = document.getElementById('chatbot-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    let messageHTML = `<div class="message-content"><p>${content}</p></div>`;
    
    // Add follow-up questions if available
    if (followUpQuestions && followUpQuestions.length > 0) {
      messageHTML += '<div class="follow-up-questions">';
      messageHTML += '<p class="follow-up-label">Follow-up questions:</p>';
      followUpQuestions.forEach(question => {
        messageHTML += `<button class="follow-up-btn" onclick="window.GeminiChatbot.sendFollowUp('${question.replace(/'/g, "\\'")}')">${question}</button>`;
      });
      messageHTML += '</div>';
    }
    
    messageDiv.innerHTML = messageHTML;
    messagesContainer.appendChild(messageDiv);
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  GeminiChatbotWidget.prototype.addMessageWithTypewriter = function(content, sender) {
    const messagesContainer = document.getElementById('chatbot-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    // Create message with full content but hidden
    let messageHTML = `<div class="message-content"><p><span class="typewriter-visible"></span><span class="typewriter-cursor">|</span></p></div>`;
    messageDiv.innerHTML = messageHTML;
    messagesContainer.appendChild(messageDiv);
    
    const visibleElement = messageDiv.querySelector('.typewriter-visible');
    const cursorElement = messageDiv.querySelector('.typewriter-cursor');
    let textIndex = 0;
    
    const self = this;
    const typewriterInterval = setInterval(() => {
      if (textIndex < content.length) {
        visibleElement.textContent = content.substring(0, textIndex + 1);
        textIndex++;
        // Scroll to bottom as text appears
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      } else {
        clearInterval(typewriterInterval);
        // Remove cursor when done
        cursorElement.style.display = 'none';
      }
    }, 30);
  }

  GeminiChatbotWidget.prototype.addSuggestions = function(suggestions) {
    const messagesContainer = document.getElementById('chatbot-messages');
    const suggestionsDiv = document.createElement('div');
    suggestionsDiv.className = 'message bot-message suggestions';

    let suggestionsHTML = '<div class="message-content">';
    suggestionsHTML += '<p><strong>Here are some related questions:</strong></p>';
    suggestionsHTML += '<div class="suggestions-list">';
    
    suggestions.forEach((suggestion, index) => {
      // Handle both string suggestions and object suggestions
      const questionText = typeof suggestion === 'string' ? suggestion : suggestion.question || suggestion.originalQuestion || suggestion;
      const cleanQuestion = questionText.replace(/'/g, "\\'");
      suggestionsHTML += `<button class="suggestion-btn" onclick="window.GeminiChatbot.sendFollowUp('${cleanQuestion}')">${questionText}</button>`;
    });
    
    suggestionsHTML += '</div>';
    suggestionsHTML += '</div>';

    suggestionsDiv.innerHTML = suggestionsHTML;
    messagesContainer.appendChild(suggestionsDiv);

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  GeminiChatbotWidget.prototype.addFollowUpQuestions = function(followUpQuestions) {
    const messagesContainer = document.getElementById('chatbot-messages');
    const followUpDiv = document.createElement('div');
    followUpDiv.className = 'message bot-message follow-up-questions';

    let followUpHTML = '<div class="message-content">';
    followUpHTML += '<p><strong>Follow-up questions:</strong></p>';
    followUpHTML += '<div class="follow-up-list">';
    
    followUpQuestions.forEach(question => {
      followUpHTML += `<button class="follow-up-btn" onclick="window.GeminiChatbot.sendFollowUp('${question.replace(/'/g, "\\'")}')">${question}</button>`;
    });
    
    followUpHTML += '</div>';
    followUpHTML += '</div>';

    followUpDiv.innerHTML = followUpHTML;
    messagesContainer.appendChild(followUpDiv);

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  GeminiChatbotWidget.prototype.sendFollowUp = function(question) {
    const input = document.getElementById('chatbot-input');
    input.value = question;
    this.sendMessage();
  }

  GeminiChatbotWidget.prototype.showTypingIndicator = function() {
    const messagesContainer = document.getElementById('chatbot-messages');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message bot-message';
    typingDiv.id = 'typing-indicator';
    
    typingDiv.innerHTML = `
      <div class="typing-indicator">
        <span>typing</span>
        <div class="typing-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    `;
    
    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  GeminiChatbotWidget.prototype.hideTypingIndicator = function() {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
      typingIndicator.remove();
    }
  }

  GeminiChatbotWidget.prototype.showChatWindow = function() {
    const chatWindow = document.getElementById('chatbot-window');
    const overlay = document.getElementById('chatbot-overlay');
    chatWindow.classList.add('show');
    overlay.classList.add('show');
  }

  GeminiChatbotWidget.prototype.showHistory = function() {
    const chatMessages = document.getElementById('chatbot-messages');
    const historyView = document.getElementById('history-view');
    const sessionView = document.getElementById('session-view');
    const inputArea = document.querySelector('.chatbot-input-area');
    
    chatMessages.style.display = 'none';
    sessionView.style.display = 'none';
    inputArea.style.display = 'none';
    historyView.style.display = 'block';
    this.currentView = 'history';
    
    // Only load chat history if we're coming from chat view or if history is empty
    const historyMessages = document.getElementById('history-messages');
    if (this.currentView !== 'session' || !historyMessages.children.length || historyMessages.innerHTML.includes('Loading')) {
      this.loadChatHistory();
    }
  }

  GeminiChatbotWidget.prototype.showChat = function() {
    const chatMessages = document.getElementById('chatbot-messages');
    const historyView = document.getElementById('history-view');
    const sessionView = document.getElementById('session-view');
    const inputArea = document.querySelector('.chatbot-input-area');
    
    chatMessages.style.display = 'block';
    inputArea.style.display = 'block';
    historyView.style.display = 'none';
    sessionView.style.display = 'none';
    this.currentView = 'chat';
    
    // Clear cached data when returning to chat to ensure fresh data next time
    this.cachedHistoryData = null;
  }

  GeminiChatbotWidget.prototype.loadChatHistory = function() {
    const historyMessages = document.getElementById('history-messages');
    historyMessages.innerHTML = '<div class="loading-history">Loading your chat history...</div>';

    const self = this;
    fetch(`${this.config.apiUrl}/api/auth/chat-history`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
        'Content-Type': 'application/json'
      }
    })
    .then(response => response.json())
    .then(data => {
      console.log('Chat history API response:', data);
      if (data.success && data.history && data.history.length > 0) {
        console.log('History data:', data.history);
        self.cachedHistoryData = data.history; // Cache the data
        self.displayChatHistory(data.history);
      } else {
        historyMessages.innerHTML = '<div class="no-history">No chat history found. Start a conversation to see your history here!</div>';
      }
    })
    .catch(error => {
      console.error('Error loading chat history:', error);
      historyMessages.innerHTML = '<div class="error-history">Failed to load chat history. Please try again later.</div>';
    });
  }

  GeminiChatbotWidget.prototype.displayChatHistory = function(history) {
    const historyMessages = document.getElementById('history-messages');
    historyMessages.innerHTML = '';

    const self = this;
    console.log('Displaying chat history:', history);

    // Display each chat history document as a session
    history.forEach((chatHistory, index) => {
      console.log(`Session ${index}:`, chatHistory);
      console.log(`Messages in session ${index}:`, chatHistory.messages);
      
      const sessionDiv = document.createElement('div');
      sessionDiv.className = 'history-session';
      
      const sessionHeader = document.createElement('div');
      sessionHeader.className = 'session-header clickable';
      const sessionDate = new Date(chatHistory.createdAt).toLocaleDateString();
      const sessionTime = new Date(chatHistory.createdAt).toLocaleTimeString();
      const messageCount = chatHistory.messages ? chatHistory.messages.length : 0;
      
      sessionHeader.innerHTML = `
        <h5>
          <span class="session-icon">💬</span>
          Session: ${sessionDate} at ${sessionTime} 
          <span class="message-count">(${messageCount} messages)</span>
        </h5>
      `;
      sessionDiv.appendChild(sessionHeader);

      // Add click event to open session view
      sessionHeader.addEventListener('click', function() {
        console.log('Session clicked:', chatHistory);
        self.showSession(chatHistory);
      });

      historyMessages.appendChild(sessionDiv);
    });

    // Scroll to top of history
    historyMessages.scrollTop = 0;
  }

  GeminiChatbotWidget.prototype.showSession = function(chatHistory) {
    console.log('showSession called with:', chatHistory);
    console.log('Messages array:', chatHistory.messages);
    console.log('Messages length:', chatHistory.messages ? chatHistory.messages.length : 'undefined');
    
    const sessionView = document.getElementById('session-view');
    const chatMessages = document.getElementById('chatbot-messages');
    const historyView = document.getElementById('history-view');
    const inputArea = document.querySelector('.chatbot-input-area');
    
    chatMessages.style.display = 'none';
    historyView.style.display = 'none';
    inputArea.style.display = 'none';
    sessionView.style.display = 'block';
    this.currentView = 'session';
    this.currentSessionData = chatHistory;

    // Update session title
    const sessionTitle = document.getElementById('session-title');
    const sessionDate = new Date(chatHistory.createdAt).toLocaleDateString();
    const sessionTime = new Date(chatHistory.createdAt).toLocaleTimeString();
    sessionTitle.innerText = `💬 ${sessionDate} at ${sessionTime}`;
    
    // Display session messages
    const sessionChatMessages = document.getElementById('session-chat-messages');
    sessionChatMessages.innerHTML = '';
    
    if (chatHistory.messages && chatHistory.messages.length > 0) {
      console.log('Processing messages:', chatHistory.messages);
      chatHistory.messages.forEach((message, index) => {
        console.log(`Message ${index}:`, message);
        
        // Add user query
        if (message.query) {
          console.log('Adding user query:', message.query);
          const userMsgDiv = document.createElement('div');
          userMsgDiv.className = 'session-message user-message';
          userMsgDiv.innerHTML = `
            <div class="message-content">
              <p>${message.query}</p>
              <span class="message-time">${new Date(message.timestamp).toLocaleTimeString()}</span>
            </div>
          `;
          sessionChatMessages.appendChild(userMsgDiv);
        }

        // Add bot response
        if (message.response) {
          console.log('Adding bot response:', message.response);
          const botMsgDiv = document.createElement('div');
          botMsgDiv.className = 'session-message bot-message';
          const confidenceText = message.confidence ? ` (${message.confidence})` : '';
          botMsgDiv.innerHTML = `
            <div class="message-content">
              <p>${message.response}</p>
              <span class="message-time">${new Date(message.timestamp).toLocaleTimeString()}${confidenceText}</span>
            </div>
          `;
          sessionChatMessages.appendChild(botMsgDiv);
        }
      });
    } else {
      console.log('No messages found in session');
      sessionChatMessages.innerHTML = '<div class="no-messages">No messages in this session.</div>';
    }

    // Scroll to top
    sessionChatMessages.scrollTop = 0;
  }

  // Global initialization function
  window.GeminiChatbot = {
    init: function(config) {
      if (!config.clientId) {
        console.error('GeminiChatbot: clientId is required');
        return;
      }
      
      window.GeminiChatbot.instance = new GeminiChatbotWidget(config);
    },
    
    sendFollowUp: function(question) {
      if (window.GeminiChatbot.instance) {
        window.GeminiChatbot.instance.sendFollowUp(question);
      }
    }
  };

})();
