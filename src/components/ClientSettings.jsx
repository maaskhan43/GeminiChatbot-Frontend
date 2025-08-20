import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { clientsAPI } from '../api/clients';
import './ClientSettings.css';

const ClientSettings = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  const [chatHistory, setChatHistory] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [embedScript, setEmbedScript] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    website: '',
    description: '',
    industry: '',
    contactEmail: ''
  });

  useEffect(() => {
    fetchClientDetails();
    fetchEmbedScript();
  }, [clientId]);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchChatHistory();
    }
  }, [activeTab, clientId]);

  const fetchClientDetails = async () => {
    try {
      setLoading(true);
      const response = await clientsAPI.getClientById(clientId);
      if (response.success) {
        setClient(response.client);
        setFormData({
          name: response.client.name || '',
          website: response.client.website || '',
          description: response.client.description || '',
          industry: response.client.industry || '',
          contactEmail: response.client.contactEmail || ''
        });
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmbedScript = async () => {
    try {
      const response = await clientsAPI.getEmbedScript(clientId);
      if (response.success) {
        setEmbedScript(response.embedScript);
      }
    } catch (error) {
      console.error('Failed to fetch embed script:', error);
    }
  };

  const fetchChatHistory = async () => {
    try {
      setChatLoading(true);
      const response = await clientsAPI.getChatHistory(clientId);
      if (response.success) {
        setChatHistory(response.history || []);
      }
    } catch (error) {
      console.error('Failed to fetch chat history:', error);
      setChatHistory([]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleFormChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleUpdateClient = async (e) => {
    e.preventDefault();
    try {
      setUpdateLoading(true);
      setError(null);
      
      const response = await clientsAPI.updateClient(clientId, formData);
      if (response.success) {
        setClient(response.client);
        alert('Client updated successfully!');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setUpdateLoading(false);
    }
  };

  const copyEmbedScript = () => {
    navigator.clipboard.writeText(embedScript);
    alert('Embed script copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="client-settings-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading client settings...</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="client-settings-container">
        <div className="error-state">
          <h3>Client not found</h3>
          <button className="btn btn-primary" onClick={() => navigate('/clients')}>
            Back to Clients
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="client-settings-container">
      <div className="settings-header">
        <button className="back-btn" onClick={() => navigate('/clients')}>
          ← Back to Clients
        </button>
        <h2>Settings - {client.name}</h2>
      </div>

      {error && (
        <div className="error-message">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="settings-tabs">
        <button 
          className={`tab ${activeTab === 'details' ? 'active' : ''}`}
          onClick={() => setActiveTab('details')}
        >
          📋 Client Details
        </button>
        <button 
          className={`tab ${activeTab === 'embed' ? 'active' : ''}`}
          onClick={() => setActiveTab('embed')}
        >
          🔗 Embed Script
        </button>
        <button 
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          💬 Chat History
        </button>
      </div>

      <div className="settings-content">
        {activeTab === 'details' && (
          <div className="details-tab">
            <div className="client-info-card">
              <h3>Current Information</h3>
              <div className="info-grid">
                <div className="info-item">
                  <strong>Name:</strong> {client.name}
                </div>
                <div className="info-item">
                  <strong>Website:</strong> 
                  <a href={client.website} target="_blank" rel="noopener noreferrer">
                    {client.website}
                  </a>
                </div>
                <div className="info-item">
                  <strong>Status:</strong> 
                  <span className={`status-badge ${client.status}`}>{client.status}</span>
                </div>
                <div className="info-item">
                  <strong>Pages Scraped:</strong> {client.totalPagesScrapped || 0}
                </div>
                <div className="info-item">
                  <strong>Q&A Pairs:</strong> {client.totalQAPairs || 0}
                </div>
                <div className="info-item">
                  <strong>Created:</strong> {new Date(client.createdAt).toLocaleString()}
                </div>
                {client.lastScrapedAt && (
                  <div className="info-item">
                    <strong>Last Scraped:</strong> {new Date(client.lastScrapedAt).toLocaleString()}
                  </div>
                )}
              </div>
            </div>

            <div className="update-form-card">
              <h3>Update Client Information</h3>
              <form onSubmit={handleUpdateClient} className="update-form">
                <div className="form-group">
                  <label htmlFor="name">Client Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="website">Website URL</label>
                  <input
                    type="url"
                    id="website"
                    name="website"
                    value={formData.website}
                    onChange={handleFormChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleFormChange}
                    rows="3"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="industry">Industry</label>
                  <input
                    type="text"
                    id="industry"
                    name="industry"
                    value={formData.industry}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="contactEmail">Contact Email</label>
                  <input
                    type="email"
                    id="contactEmail"
                    name="contactEmail"
                    value={formData.contactEmail}
                    onChange={handleFormChange}
                  />
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={updateLoading}
                >
                  {updateLoading ? 'Updating...' : '💾 Update Client'}
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'embed' && (
          <div className="embed-tab">
            <div className="embed-card">
              <h3>Chatbot Embed Script</h3>
              <p>Copy and paste this script into your website to add the chatbot widget:</p>
              
              <div className="script-container">
                <pre className="script-code">{embedScript}</pre>
                <button className="copy-btn" onClick={copyEmbedScript}>
                  📋 Copy Script
                </button>
              </div>

              <div className="embed-instructions">
                <h4>Integration Instructions:</h4>
                <ol>
                  <li>Copy the script above</li>
                  <li>Paste it before the closing <code>&lt;/body&gt;</code> tag on your website</li>
                  <li>The chatbot widget will automatically appear on your website</li>
                  <li>Users can interact with it to get answers from your Q&A database</li>
                </ol>
              </div>

              <div className="embed-preview">
                <h4>Widget Configuration:</h4>
                <div className="config-grid">
                  <div className="config-item">
                    <strong>Client ID:</strong> {clientId}
                  </div>
                  <div className="config-item">
                    <strong>Position:</strong> Bottom Right
                  </div>
                  <div className="config-item">
                    <strong>Theme:</strong> Default
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="history-tab">
            <div className="history-card">
              <h3>Chat History</h3>
              
              {chatLoading ? (
                <div className="loading">
                  <div className="spinner"></div>
                  <p>Loading chat history...</p>
                </div>
              ) : chatHistory.length === 0 ? (
                <div className="empty-state">
                  <h4>No chat history yet</h4>
                  <p>Chat conversations will appear here once users start interacting with the chatbot.</p>
                </div>
              ) : (
                <div className="history-list">
                  {chatHistory.map((chat, index) => (
                    <div key={index} className="chat-item">
                      <div className="chat-header">
                        <span className="chat-date">
                          {chat.timestamp ? new Date(chat.timestamp).toLocaleString() : 'Invalid Date'}
                        </span>
                        <span className="chat-session">
                          Session: {chat.sessionId ? chat.sessionId.substring(0, 8) : 'Unknown'}...
                        </span>
                      </div>
                      
                      <div className="chat-messages">
                        <div className="message user-message">
                          <strong>User:</strong> {chat.userQuery || 'No query available'}
                        </div>
                        <div className="message bot-message">
                          <strong>Bot:</strong> {chat.botResponse || 'No response available'}
                        </div>
                        {(chat.confidence !== undefined && chat.confidence !== null) && (
                          <div className="chat-meta">
                            <span className="confidence">
                              Confidence: {typeof chat.confidence === 'number' 
                                ? (chat.confidence * 100).toFixed(1) + '%'
                                : chat.confidence
                              }
                            </span>
                            {chat.language && chat.language !== 'en' && (
                              <span className="language">
                                Language: {chat.language.toUpperCase()}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientSettings;
