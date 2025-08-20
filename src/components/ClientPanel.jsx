import { useState, useEffect } from 'react';
import './ClientPanel.css';

const ClientPanel = ({ clientId, clientName, onClose }) => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({
    totalUsers: 0,
    avgConfidence: 0,
    totalQueries: 0,
    activeUsers: 0
  });
  const [userChats, setUserChats] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    if (clientId) {
      fetchUsers();
      fetchAnalytics();
    }
  }, [clientId]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/admin/clients/${clientId}/users`, {
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
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/admin/clients/${clientId}/analytics`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setAnalytics(data.analytics);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const fetchUserChats = async (userId) => {
    try {
      setChatLoading(true);
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/admin/users/${userId}/chat-history`, {
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

  return (
    <div className="client-panel-overlay">
      <div className="client-panel">
        <div className="client-panel-header">
          <h2>👥 {clientName} - User Dashboard</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Analytics Cards */}
        <div className="analytics-section">
          <div className="analytics-card">
            <div className="analytics-icon">👥</div>
            <div className="analytics-content">
              <h3>{analytics.totalUsers}</h3>
              <p>Total Users</p>
            </div>
          </div>
          
          <div className="analytics-card">
            <div className="analytics-icon">🎯</div>
            <div className="analytics-content">
              <h3>{analytics.avgConfidence}%</h3>
              <p>Avg Confidence</p>
            </div>
          </div>
          
          <div className="analytics-card">
            <div className="analytics-icon">💬</div>
            <div className="analytics-content">
              <h3>{analytics.totalQueries}</h3>
              <p>Total Queries</p>
            </div>
          </div>
        </div>

        {/* Users Grid */}
        <div className="users-section">
          <h3>Users ({users.length})</h3>
          
          {loading ? (
            <div className="loading">Loading users...</div>
          ) : (
            <div className="users-grid">
              {users.map(user => (
                <div 
                  key={user._id} 
                  className={`user-card ${getActivityStatus(user.lastLogin)}`}
                  onClick={() => handleUserClick(user)}
                >
                  <div className="user-avatar">
                    {user.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="user-info">
                    <h4>{user.email}</h4>
                    <p className="user-stats">
                      {user.metadata?.totalQueries || 0} queries • 
                      {user.metadata?.totalSessions || 0} sessions
                    </p>
                    <p className="user-last-seen">
                      Last seen: {formatDate(user.lastLogin)}
                    </p>
                  </div>
                  <div className={`user-status ${getActivityStatus(user.lastLogin)}`}>
                    {getActivityStatus(user.lastLogin) === 'active' && '🟢'}
                    {getActivityStatus(user.lastLogin) === 'recent' && '🟡'}
                    {getActivityStatus(user.lastLogin) === 'inactive' && '⚫'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User Detail Modal */}
        {selectedUser && (
          <div className="user-detail-overlay">
            <div className="user-detail-modal">
              <div className="user-detail-header">
                <div className="user-detail-info">
                  <div className="user-detail-avatar">
                    {selectedUser.email.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3>{selectedUser.email}</h3>
                    <p>Joined {formatDate(selectedUser.createdAt)}</p>
                  </div>
                </div>
                <button className="close-btn" onClick={closeUserDetail}>✕</button>
              </div>

              <div className="user-detail-stats">
                <div className="stat-item">
                  <span className="stat-label">Total Queries:</span>
                  <span className="stat-value">{selectedUser.metadata?.totalQueries || 0}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Total Sessions:</span>
                  <span className="stat-value">{selectedUser.metadata?.totalSessions || 0}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Last Login:</span>
                  <span className="stat-value">{formatDate(selectedUser.lastLogin)}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Status:</span>
                  <span className={`stat-value status-${selectedUser.isVerified ? 'verified' : 'unverified'}`}>
                    {selectedUser.isVerified ? '✅ Verified' : '❌ Unverified'}
                  </span>
                </div>
              </div>

              <div className="user-chat-history">
                <h4>💬 Chat History</h4>
                {chatLoading ? (
                  <div className="loading">Loading chat history...</div>
                ) : userChats.length > 0 ? (
                  <div className="chat-sessions">
                    {userChats.map(session => (
                      <div key={session._id} className="chat-session">
                        <div className="session-header">
                          <span className="session-date">
                            {formatDate(session.createdAt)}
                          </span>
                          <span className="session-stats">
                            {session.messages?.length || 0} messages
                          </span>
                        </div>
                        <div className="session-messages">
                          {session.messages?.slice(0, 3).map((message, index) => (
                            <div key={index} className="message-preview">
                              <div className="message-query">
                                <strong>Q:</strong> {message.query}
                              </div>
                              <div className="message-response">
                                <strong>A:</strong> {message.response?.substring(0, 100)}...
                              </div>
                              <div className="message-confidence">
                                Confidence: {Math.round(message.confidence * 100)}%
                              </div>
                            </div>
                          ))}
                          {session.messages?.length > 3 && (
                            <div className="more-messages">
                              +{session.messages.length - 3} more messages
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-chats">No chat history found</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientPanel;
