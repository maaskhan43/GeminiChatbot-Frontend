import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getClientInfo } from '../api/clientAuth';
import './ClientPanel.css';

const ClientPanelPage = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clientInfo, setClientInfo] = useState(null);
  const [analytics, setAnalytics] = useState({
    totalUsers: 0,
    avgConfidence: 0,
    totalQueries: 0,
    activeUsers: 0
  });
  const [userChats, setUserChats] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [client, setClient] = useState(null);
  const [error, setError] = useState('');
  const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

  useEffect(() => {
    const fetchClientData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('clientToken');
        if (!token) {
          throw new Error('Authentication required');
        }
        
        const response = await getClientInfo(clientId, token);
        if (response.success) {
          setClient(response.client);
          setClientInfo(response.client);
        }
      } catch (err) {
        setError(err.message || 'Failed to load client data');
        console.error('Error fetching client data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (clientId) {
      fetchClientData();
      fetchUsers();
      fetchAnalytics();
    }
  }, [clientId]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('clientToken');

      const response = await fetch(`${API_URL}/api/client/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('clientToken');
      const response = await fetch(`${API_URL}/api/client/analytics`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setAnalytics({
          totalUsers: data.analytics.totalUsers || 0,
          verifiedUsers: data.analytics.verifiedUsers || 0,
          totalQueries: data.analytics.totalQueries || 0,
          avgConfidence: data.analytics.verificationRate || 0
        });
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('clientToken');
    navigate('/client/login');
  };

  const fetchUserChats = async (userId) => {
    try {
      setChatLoading(true);
      const token = localStorage.getItem('clientToken');
      const response = await fetch(`${API_URL}/api/client/users/${userId}/chat-history`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setUserChats(data.history);
      }
    } catch (error) {
      console.error('Error fetching user chats:', error);
    } finally {
      setChatLoading(false);
    }
  };

  const handleUserClick = (user) => {
    setSelectedUser(user);
    fetchUserChats(user._id);
  };

  const closeUserDetail = () => {
    setSelectedUser(null);
    setUserChats([]);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActivityStatus = (lastLogin) => {
    const daysSinceLogin = (Date.now() - new Date(lastLogin)) / (1000 * 60 * 60 * 24);
    if (daysSinceLogin < 1) return 'active';
    if (daysSinceLogin < 7) return 'recent';
    return 'inactive';
  };

  if (!clientId) {
    return (
      <div className="client-panel-page">
        <div className="error-message">
          <h2>❌ No Client Selected</h2>
          <p>Please provide a client ID in the URL: /cpanel/:clientId</p>
          <button onClick={() => navigate('/clients')} className="btn btn-primary">
            Go to Clients
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="client-panel-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading">Loading client panel...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="client-panel-page">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h2>Access Error</h2>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={() => navigate(`/client/login?clientId=${clientId}`)}>
            <span className="btn-icon">🔑</span>
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="client-panel-page">
      <div className="client-panel">
        {/* Enhanced Header with Logo and Navigation */}
        <div className="client-panel-header">
          <div className="header-left">
            <div className="logo-section">
              <div className="logo-icon">🤖</div>
              <div className="header-info">
                <h2>
                  <span className="welcome-text">Welcome back,</span>
                  <span className="client-name">{client?.name || 'Client'}</span>
                </h2>
                <p className="header-subtitle">
                  <span className="status-indicator">🟢</span>
                  Client Dashboard • {client?.website || 'No website'}
                </p>
              </div>
            </div>
          </div>
          <div className="header-actions">
            <button className="btn btn-secondary" onClick={() => window.open(client?.website, '_blank')}>
              <span className="btn-icon">🌐</span>
              Visit Website
            </button>
            <button className="btn btn-primary" onClick={handleLogout}>
              <span className="btn-icon">🚪</span>
              Logout
            </button>
          </div>
        </div>

        {/* Enhanced Analytics Section */}
        <div className="analytics-section">
          <div className="analytics-card">
            <div className="analytics-icon">👥</div>
            <div className="analytics-content">
              <h3>{analytics.totalUsers}</h3>
              <p>Total Users</p>
              <div className="analytics-trend">
                <span className="trend-icon">📈</span>
                <span className="trend-text">+12% this month</span>
              </div>
            </div>
          </div>
          <div className="analytics-card">
            <div className="analytics-icon">✅</div>
            <div className="analytics-content">
              <h3>{analytics.verifiedUsers || 0}</h3>
              <p>Verified Users</p>
              <div className="analytics-trend">
                <span className="trend-icon">🎯</span>
                <span className="trend-text">{Math.round((analytics.verifiedUsers / analytics.totalUsers) * 100) || 0}% verified</span>
              </div>
            </div>
          </div>
          <div className="analytics-card">
            <div className="analytics-icon">💬</div>
            <div className="analytics-content">
              <h3>{analytics.totalQueries}</h3>
              <p>Total Queries</p>
              <div className="analytics-trend">
                <span className="trend-icon">⚡</span>
                <span className="trend-text">Active conversations</span>
              </div>
            </div>
          </div>
          <div className="analytics-card">
            <div className="analytics-icon">📊</div>
            <div className="analytics-content">
              <h3>{Math.round(analytics.avgConfidence)}%</h3>
              <p>Success Rate</p>
              <div className="analytics-trend">
                <span className="trend-icon">🎯</span>
                <span className="trend-text">High performance</span>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Client Information Section */}
        <div className="client-info-section">
          <h3>
            <span className="section-icon">ℹ️</span>
            Client Information
          </h3>
          <div className="client-info-grid">
            <div className="info-item">
              <label>
                <span className="info-icon">🏢</span>
                Company Name
              </label>
              <span>{client?.name || 'N/A'}</span>
            </div>
            <div className="info-item">
              <label>
                <span className="info-icon">📧</span>
                Email Address
              </label>
              <span>{client?.contactEmail || 'N/A'}</span>
            </div>
            <div className="info-item">
              <label>
                <span className="info-icon">🌐</span>
                Website URL
              </label>
              <span>{client?.website || 'N/A'}</span>
            </div>
            <div className="info-item">
              <label>
                <span className="info-icon">📅</span>
                Member Since
              </label>
              <span>{client?.createdAt ? new Date(client.createdAt).toLocaleString() : 'N/A'}</span>
            </div>
            <div className="info-item">
              <label>
                <span className="info-icon">🔧</span>
                Account Status
              </label>
              <span className="status-badge active">
                <span className="status-dot"></span>
                {client?.status ? client.status.charAt(0).toUpperCase() + client.status.slice(1) : 'Active'}
              </span>
            </div>
          </div>
        </div>

        {/* Enhanced Users Section */}
        <div className="users-section">
          <div className="section-header">
            <h3>
              <span className="section-icon">👥</span>
              Registered Users
              <span className="user-count">({users.length})</span>
            </h3>
            <div className="section-actions">
              <button className="btn btn-secondary" onClick={fetchUsers}>
                <span className="btn-icon">🔄</span>
                Refresh
              </button>
            </div>
          </div>
          
          {users.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">👤</div>
              <h4>No Users Yet</h4>
              <p>Users will appear here once they register through your chatbot widget.</p>
              <button className="btn btn-primary" onClick={() => window.open(client?.website, '_blank')}>
                <span className="btn-icon">🌐</span>
                Visit Your Website
              </button>
            </div>
          ) : (
            <div className="users-grid">
              {users.map((user, index) => (
                <div key={user._id || index} className={`user-card ${user.isVerified ? 'verified' : 'unverified'}`}>
                  <div className="user-avatar">
                    {user.email ? user.email.charAt(0).toUpperCase() : '?'}
                  </div>
                  <div className="user-info">
                    <h4>{user.email || 'Unknown User'}</h4>
                    <p>
                      <span className="user-meta">
                        <span className="meta-icon">📅</span>
                        Joined {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                      </span>
                    </p>
                    <p>
                      <span className="user-meta">
                        <span className="meta-icon">💬</span>
                        {user.queryCount || 0} queries
                      </span>
                    </p>
                  </div>
                  <div className="user-status">
                    {user.isVerified ? (
                      <span className="status-verified">
                        <span className="status-icon">✅</span>
                        Verified
                      </span>
                    ) : (
                      <span className="status-unverified">
                        <span className="status-icon">⏳</span>
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientPanelPage;
