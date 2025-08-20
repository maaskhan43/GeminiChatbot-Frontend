import { useState, useEffect } from 'react';
import { clientsAPI } from '../api/clients';
import './Clients.css';

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [scrapingJobs, setScrapingJobs] = useState({});
  const [showQAModal, setShowQAModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [qaData, setQAData] = useState(null);
  const [qaLoading, setQALoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);
  const [showDeleteQAModal, setShowDeleteQAModal] = useState(false);
  const [clientForQADataDelete, setClientForQADataDelete] = useState(null);
  const [showDeleteChunksModal, setShowDeleteChunksModal] = useState(false);
  const [clientForChunksDelete, setClientForChunksDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(null);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await clientsAPI.getClients();
      if (response.success) {
        setClients(response.clients);
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartScraping = async (clientId) => {
    try {
      setScrapingJobs(prev => ({ ...prev, [clientId]: { status: 'starting' } }));
      
      const response = await clientsAPI.startScraping(clientId);
      if (response.success) {
        setScrapingJobs(prev => ({ 
          ...prev, 
          [clientId]: { 
            status: 'running', 
            jobId: response.job_id,
            urlsFound: response.urls_found
          } 
        }));
        
        // Poll for status updates
        pollScrapingStatus(response.job_id, clientId);
      }
    } catch (error) {
      setError(error.message);
      setScrapingJobs(prev => ({ ...prev, [clientId]: { status: 'error', error: error.message } }));
    }
  };

  const handleExportCSV = async (clientId, clientName) => {
    try {
      setError(null);
      await clientsAPI.exportScrapedDataCSV(clientId);
      // Success message is handled by the API (auto-download)
    } catch (error) {
      setError(`Failed to export CSV for ${clientName}: ${error.message}`);
    }
  };

  const handleQAUpload = async (clientId, clientName, file) => {
    try {
      setError(null);
      console.log(`📤 Uploading Q&A file for ${clientName}:`, file.name);
      
      // TODO: Implement API call for Q&A upload
      await clientsAPI.uploadQAPairs(clientId, file);
      
      console.log(`✅ Successfully uploaded Q&A file for ${clientName}`);
      // Refresh client list to update Q&A count
      fetchClients();
    } catch (error) {
      setError(`Failed to upload Q&A file for ${clientName}: ${error.message}`);
    }
  };

  const handleFileSelect = (clientId, clientName, event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = [
        'text/csv',
        'application/pdf', 
        'text/plain',
        'application/json',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/markdown',
        'text/x-markdown'
      ];
      
      const fileExtension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
      const allowedExtensions = ['.md', '.markdown'];

      if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
        setError(`Unsupported file type. Please upload CSV, PDF, TXT, JSON, XLSX, or Markdown files.`);
        return;
      }
      
      handleQAUpload(clientId, clientName, file);
    }
    // Reset file input
    event.target.value = '';
  };

  const handleViewData = async (client) => {
    try {
      console.log('🔍 View Data clicked for client:', client.name, 'ID:', client._id);
      console.log('📊 Client totalQAPairs:', client.total_pairs);
      
      setQALoading(true);
      setSelectedClient(client);
      setShowQAModal(true);
      
      console.log('📡 Making API call to get Q&A pairs...');
      const response = await clientsAPI.getClientQAPairs(client._id);
      console.log('📡 API Response:', response);
      
      if (response.success) {
        // Transform the response to match expected format
        const transformedResponse = {
          success: true,
          client: {
            id: response.client_id,
            name: response.client_name,
            website: client.website
          },
          totalPairs: response.total_pairs,
          pairs: []
        };
        
        // Extract pairs from uploads
        if (response.uploads && response.uploads.length > 0) {
          response.uploads.forEach(upload => {
            if (upload.samplePairs && upload.samplePairs.length > 0) {
              upload.samplePairs.forEach(pair => {
                transformedResponse.pairs.push({
                  question: pair.question,
                  answer: pair.answer,
                  category: pair.category || 'general',
                  confidence: pair.confidence || 1.0,
                  fileType: upload.fileType,
                  fileName: upload.fileName,
                  createdAt: upload.uploadedAt
                });
              });
            }
          });
        }
        
        setQAData(transformedResponse);
        console.log('✅ Q&A data loaded successfully:', transformedResponse.totalPairs, 'pairs');
      } else {
        console.error('❌ API response not successful:', response);
        setError(`Failed to load Q&A data: ${response.message || 'Unknown error'}`);
        setShowQAModal(false);
      }
    } catch (error) {
      console.error('❌ Error in handleViewData:', error);
      setError(`Failed to load Q&A data for ${client.name}: ${error.message}`);
      setShowQAModal(false);
    } finally {
      setQALoading(false);
    }
  };

  const handleDownloadMarkdown = async (client) => {
    try {
      setError(null);
      await clientsAPI.downloadQAMarkdown(client._id, client.name);
    } catch (error) {
      setError(`Failed to download Q&A data for ${client.name}: ${error.message}`);
    }
  };

  const handleDeleteClient = async () => {
    if (!clientToDelete) return;
    
    try {
      const response = await clientsAPI.deleteClient(clientToDelete._id);
      if (response.success) {
        setClients(clients.filter(c => c._id !== clientToDelete._id));
        setShowDeleteModal(false);
        setClientToDelete(null);
      }
    } catch (error) {
      console.error('Error deleting client:', error);
    }
  };

  const confirmDeleteClient = async () => {
    if (!clientToDelete) return;
    
    try {
      setError(null);
      
      // Call backend API to delete client
      await clientsAPI.deleteClient(clientToDelete._id);
      
      // Remove from local state only after successful API call
      setClients(prev => prev.filter(c => c._id !== clientToDelete._id));
      
      console.log(`✅ Successfully deleted client: ${clientToDelete.name}`);
    } catch (error) {
      setError(`Failed to delete client ${clientToDelete.name}: ${error.message}`);
    } finally {
      setShowDeleteModal(false);
      setClientToDelete(null);
    }
  };

  const cancelDeleteClient = () => {
    setShowDeleteModal(false);
    setClientToDelete(null);
  };

  const closeQAModal = () => {
    setShowQAModal(false);
    setSelectedClient(null);
    setQAData(null);
  };

  const pollScrapingStatus = async (jobId, clientId) => {
    const pollInterval = setInterval(async () => {
      try {
        const statusResponse = await clientsAPI.getScrapingStatus(jobId);
        
        setScrapingJobs(prev => ({ 
          ...prev, 
          [clientId]: { 
            ...prev[clientId],
            status: statusResponse.status,
            urlsProcessed: statusResponse.urls_processed,
            totalUrls: statusResponse.total_urls,
            error: statusResponse.error,
            phases: statusResponse.phases
          } 
        }));

        if (statusResponse.status === 'completed' || statusResponse.status === 'failed') {
          clearInterval(pollInterval);
          if (statusResponse.status === 'completed') {
            fetchClients(); // Refresh client list to update scraped counts
          }
        }
      } catch (error) {
        clearInterval(pollInterval);
        setScrapingJobs(prev => ({ ...prev, [clientId]: { status: 'error', error: error.message } }));
      }
    }, 2000);
  };

  const getScrapingStatusDisplay = (clientId) => {
    const job = scrapingJobs[clientId];
    if (!job) return null;

    const getPhaseDisplay = (phase, label, icon) => {
      if (!job.phases || !job.phases[phase]) return null;
      
      const phaseData = job.phases[phase];
      const progress = phaseData.progress;
      
      switch (phaseData.status) {
        case 'running':
          return (
            <div className="phase-item running">
              <span className="phase-icon">{icon}</span>
              <span className="phase-text">
                {label}... {progress && progress.total > 0 ? `(${progress.current}/${progress.total})` : ''}
              </span>
            </div>
          );
        case 'completed':
          return (
            <div className="phase-item completed">
              <span className="phase-icon">✅</span>
              <span className="phase-text">{label} Complete</span>
            </div>
          );
        case 'failed':
          return (
            <div className="phase-item failed">
              <span className="phase-icon">❌</span>
              <span className="phase-text">{label} Failed</span>
            </div>
          );
        default:
          return (
            <div className="phase-item pending">
              <span className="phase-icon">⏳</span>
              <span className="phase-text">{label} Pending</span>
            </div>
          );
      }
    };

    // Handle legacy status format
    if (!job.phases) {
      switch (job.status) {
        case 'starting':
          return <span className="status starting">🔄 Starting...</span>;
        case 'running':
          return (
            <span className="status running">
              🕷️ Scraping... ({job.urlsProcessed || 0}/{job.totalUrls || job.urlsFound || '?'})
            </span>
          );
        case 'completed':
          return <span className="status completed">✅ Completed</span>;
        case 'failed':
          return <span className="status failed">❌ Failed: {job.error}</span>;
        case 'error':
          return <span className="status error">⚠️ Error: {job.error}</span>;
        default:
          return null;
      }
    }

    // New detailed phase display
    return (
      <div className="detailed-status">
        <div className="status-header">
          <span className="status-title">
            {job.status === 'completed' ? '🎉 All Complete!' : 
             job.status === 'failed' ? '❌ Process Failed' : 
             '🔄 Processing...'}
          </span>
        </div>
        <div className="phases-container">
          {getPhaseDisplay('scraping', 'Scraping Website', '🕷️')}
          {getPhaseDisplay('qa_generation', 'Generating Q&A', '🤖')}
          {getPhaseDisplay('embedding_generation', 'Creating Embeddings', '🧠')}
        </div>
        {job.error && (
          <div className="error-details">
            <span className="error-text">Error: {job.error}</span>
          </div>
        )}
      </div>
    );
  };

  const handleDeleteQAData = (client) => {
    setClientForQADataDelete(client);
    setShowDeleteQAModal(true);
  };

  const confirmDeleteQAData = async () => {
    if (!clientForQADataDelete) return;
    try {
      setError(null);
      setIsDeleting(clientForQADataDelete._id);
      await clientsAPI.deleteQAData(clientForQADataDelete._id);
      fetchClients(); // Refresh clients after successful deletion
    } catch (error) {
      setError(`Failed to delete Q&A data for ${clientForQADataDelete.name}: ${error.message}`);
    } finally {
      setShowDeleteQAModal(false);
      setClientForQADataDelete(null);
      setIsDeleting(null);
    }
  };

  const cancelDeleteQAData = () => {
    setShowDeleteQAModal(false);
    setClientForQADataDelete(null);
    setIsDeleting(null);
  };

  const handleDeleteScrapedChunks = (client) => {
    setClientForChunksDelete(client);
    setShowDeleteChunksModal(true);
  };

  const confirmDeleteScrapedChunks = async () => {
    if (!clientForChunksDelete) return;
    try {
      setError(null);
      setIsDeleting(clientForChunksDelete._id);
      await clientsAPI.deleteScrapedChunks(clientForChunksDelete._id);
      fetchClients(); // Refresh clients after successful deletion
    } catch (error) {
      setError(`Failed to delete scraped chunks for ${clientForChunksDelete.name}: ${error.message}`);
    } finally {
      setShowDeleteChunksModal(false);
      setClientForChunksDelete(null);
      setIsDeleting(null);
    }
  };

  const cancelDeleteScrapedChunks = () => {
    setShowDeleteChunksModal(false);
    setClientForChunksDelete(null);
    setIsDeleting(null);
  };

  const DeleteQAConfirmModal = ({ client, onConfirm, onCancel, loading }) => {
    if (!client) return null;

    return (
      <div className="modal-overlay">
        <div className="modal-content delete-modal">
          <div className="modal-header">
            <h3>🗑️ Delete Q&A Data</h3>
          </div>
          <div className="modal-body">
            <div className="delete-warning">
              <div className="warning-icon">⚠️</div>
              <div className="warning-content">
                <h4>Are you sure you want to delete all Q&A data for this client?</h4>
                <p>This will remove <strong>{client.totalQAPairs || 'all'}</strong> Q&A pairs for <strong>{client.name}</strong>. This action cannot be undone.</p>
              </div>
            </div>
          </div>
          <div className="modal-actions">
            <button onClick={onCancel} className="btn btn-secondary" disabled={loading}>Cancel</button>
            <button onClick={onConfirm} className="btn btn-danger" disabled={loading}>
              {loading ? <div className="spinner-small"></div> : 'Yes, Delete All'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const DeleteChunksConfirmModal = ({ client, onConfirm, onCancel, loading }) => {
    if (!client) return null;

    return (
      <div className="modal-overlay">
        <div className="modal-content delete-modal">
          <div className="modal-header">
            <h3>🗑️ Delete Scraped Data</h3>
          </div>
          <div className="modal-body">
            <div className="delete-warning">
              <div className="warning-icon">⚠️</div>
              <div className="warning-content">
                <h4>Are you sure you want to delete all scraped data for this client?</h4>
                <p>This will remove all <strong>{client.totalPagesScrapped || ''}</strong> scraped pages for <strong>{client.name}</strong>. This action is irreversible.</p>
              </div>
            </div>
          </div>
          <div className="modal-actions">
            <button onClick={onCancel} className="btn btn-secondary" disabled={loading}>Cancel</button>
            <button onClick={onConfirm} className="btn btn-danger" disabled={loading}>
              {loading ? <div className="spinner-small"></div> : 'Yes, Delete All'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="clients-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading clients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="clients-container">
      <div className="clients-header">
        <h2>Client Management</h2>
        <button 
          className="btn btn-primary"
          onClick={() => setShowAddForm(true)}
        >
          + Add Client
        </button>
      </div>

      {error && (
        <div className="error-message">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {showAddForm && (
        <AddClientForm 
          onClose={() => setShowAddForm(false)}
          onSuccess={() => {
            setShowAddForm(false);
            fetchClients();
          }}
        />
      )}

      {showQAModal && (
        <QADataModal 
          client={selectedClient}
          qaData={qaData}
          loading={qaLoading}
          onClose={closeQAModal}
          onDownload={() => handleDownloadMarkdown(selectedClient)}
          onDeleteQA={handleDeleteQAData}
          onDeleteChunks={handleDeleteScrapedChunks}
        />
      )}

      {showDeleteModal && (
        <DeleteConfirmModal 
          client={clientToDelete}
          onConfirm={handleDeleteClient}
          onCancel={cancelDeleteClient}
        />
      )}

      {showDeleteQAModal && (
        <DeleteQAConfirmModal
          client={clientForQADataDelete}
          onConfirm={confirmDeleteQAData}
          onCancel={cancelDeleteQAData}
          loading={isDeleting === clientForQADataDelete?._id}
        />
      )}

      {showDeleteChunksModal && (
        <DeleteChunksConfirmModal
          client={clientForChunksDelete}
          onConfirm={confirmDeleteScrapedChunks}
          onCancel={cancelDeleteScrapedChunks}
          loading={isDeleting === clientForChunksDelete?._id}
        />
      )}

      <div className="clients-grid">
        {clients.length === 0 ? (
          <div className="empty-state">
            <h3>No clients yet</h3>
            <p>Add your first client to start scraping websites</p>
            <button 
              className="btn btn-primary"
              onClick={() => setShowAddForm(true)}
            >
              Add Your First Client
            </button>
          </div>
        ) : (
          clients.map(client => (
            <div key={client._id} className="client-card">
              <div className="client-header">
                <h3>{client.name}</h3>
                <span className={`status-badge ${client.status}`}>
                  {client.status}
                </span>
              </div>
              
              <div className="client-details">
                <p><strong>Website:</strong> <br></br><a href={client.website} target="_blank" rel="noopener noreferrer">{client.website}</a></p>
                {client.description && <p><strong>Description:</strong> {client.description}</p>}
                {client.industry && <p><strong>Industry:</strong> {client.industry}</p>}
                <p><strong>Pages Scraped:</strong> {client.totalPagesScrapped || 0}</p>
                {client.lastScrapedAt && (
                  <p><strong>Last Scraped:</strong> {new Date(client.lastScrapedAt).toLocaleString()}</p>
                )}
              </div>

              <div className="scraping-status">
                {getScrapingStatusDisplay(client._id)}
              </div>

              <div className="client-actions">
                <button 
                  className="btn btn-primary"
                  onClick={() => handleStartScraping(client._id)}
                  disabled={scrapingJobs[client._id]?.status === 'running' || scrapingJobs[client._id]?.status === 'starting'}
                >
                  🕷️ Start Scraping
                </button>
                <button 
                  className="btn btn-success"
                  onClick={() => handleExportCSV(client._id, client.name)}
                  disabled={!client.totalPagesScrapped || client.totalPagesScrapped === 0}
                  title={!client.totalPagesScrapped || client.totalPagesScrapped === 0 ? 'No scraped data to export' : 'Export scraped data as CSV'}
                >
                  📊 Export CSV
                </button>
                <div className="upload-qa-wrapper">
                  <input
                    type="file"
                    id={`qa-upload-${client._id}`}
                    accept=".csv,.pdf,.txt,.json,.xlsx,.xls,.md,.markdown"
                    onChange={(e) => handleFileSelect(client._id, client.name, e)}
                    style={{ display: 'none' }}
                  />
                  <button 
                    className="btn btn-info"
                    onClick={() => document.getElementById(`qa-upload-${client._id}`).click()}
                    title="Upload Q&A pairs (CSV, PDF, TXT, JSON, XLSX, Markdown)"
                  >
                    📤 Upload Q&A
                  </button>
                </div>
                <button 
                  className="btn btn-outline"
                  onClick={() => handleViewData(client)}
                  title={!client.totalQAPairs || client.totalQAPairs === 0 ? 'No Q&A data available' : 'View Q&A data'}
                >
                  📄 View Data
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={() => window.location.href = `/clients/${client._id}/settings`}
                  title={`Settings for ${client.name}`}
                >
                  ⚙️ Settings
                </button>
                <button 
                  className="btn btn-danger"
                  onClick={() => handleDeleteClient(client)}
                  title={`Delete ${client.name}`}
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showQAModal && (
        <QADataModal 
          client={selectedClient}
          qaData={qaData}
          loading={qaLoading}
          onClose={closeQAModal}
          onDownload={() => handleDownloadMarkdown(selectedClient)}
          onDeleteQA={handleDeleteQAData}
          onDeleteChunks={handleDeleteScrapedChunks}
        />
      )}
    </div>
  );
};

const AddClientForm = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    website: '',
    description: '',
    industry: '',
    contactEmail: '',
    cpanelPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.website) {
      setError('Name and website are required');
      return;
    }
    
    // Validate email format if provided
    if (formData.contactEmail && !/\S+@\S+\.\S+/.test(formData.contactEmail)) {
      setError('Please enter a valid email address');
      return;
    }
    
    // Validate password if provided
    if (formData.cpanelPassword && formData.cpanelPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Check for duplicate client name or website
      const response = await clientsAPI.getClients();
      if (response.success) {
        const existingClient = response.clients.find(client => 
          client.name.toLowerCase() === formData.name.toLowerCase() || 
          client.website.toLowerCase() === formData.website.toLowerCase()
        );
        
        if (existingClient) {
          if (existingClient.name.toLowerCase() === formData.name.toLowerCase()) {
            setError('A client with this name already exists');
          } else {
            setError('A client with this website already exists');
          }
          return;
        }
      }
      
      // Prepare client data with credentials if password is provided
      const clientData = { ...formData };
      if (clientData.cpanelPassword) {
        // If we have a password, ensure we have an email for JWT
        if (!clientData.contactEmail) {
          throw new Error('Contact email is required when setting up client panel access');
        }
        
        // The actual password will be hashed on the backend
        clientData.credentials = {
          email: clientData.contactEmail,
          password: clientData.cpanelPassword
        };
        // Remove plain text password from the main object
        delete clientData.cpanelPassword;
      }
      
      const createResponse = await clientsAPI.createClient(clientData);
      if (createResponse.success) {
        onSuccess();
      }
    } catch (error) {
      setError(error.message || 'Failed to create client. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>Add New Client</h3>
          <button type="button" className="close-btn" onClick={onClose} disabled={loading}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="client-form">
          {error && (
            <div className="error-message">
              <span>⚠️ {error}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="name">Client Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Acme Corporation"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="website">Website URL *</label>
            <input
              type="url"
              id="website"
              name="website"
              value={formData.website}
              onChange={handleChange}
              placeholder="https://example.com"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Brief description of the client..."
              rows="3"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="industry">Industry</label>
            <input
              type="text"
              id="industry"
              name="industry"
              value={formData.industry}
              onChange={handleChange}
              placeholder="e.g., Technology, Healthcare"
              disabled={loading}
            />
          </div>

          <div className="form-section-divider">
            <span>Client Panel Access</span>
          </div>
          
          <div className="form-group">
            <label htmlFor="contactEmail">Contact Email *</label>
            <input
              type="email"
              id="contactEmail"
              name="contactEmail"
              value={formData.contactEmail}
              onChange={handleChange}
              placeholder="contact@client.com"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="cpanelPassword">
              Client Panel Password
            </label>
            <div className="password-input-container">
              <input
                type={showPassword ? 'text' : 'password'}
                id="cpanelPassword"
                name="cpanelPassword"
                value={formData.cpanelPassword}
                onChange={handleChange}
                placeholder="Set a password for client panel access"
                disabled={loading}
                minLength="8"
              />
              <button 
                type="button" 
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            <small className="password-hint">
              Must be at least 8 characters long
            </small>
          </div>


          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const QADataModal = ({ client, qaData, loading, onClose, onDownload, onDeleteQA, onDeleteChunks }) => {
  const generateMarkdownContent = (data) => {
    if (!data || !data.pairs) return '';
    
    let markdown = `# Q&A Data for ${data.client.name}\n\n`;
    markdown += `**Website:** ${data.client.website}\n`;
    markdown += `**Total Q&A Pairs:** ${data.totalPairs}\n\n`;
    markdown += `---\n\n`;
    
    data.pairs.forEach((pair, index) => {
      markdown += `## ${index + 1}. ${pair.question}\n\n`;
      markdown += `**Answer:** ${pair.answer}\n\n`;
      if (pair.category && pair.category !== 'general') {
        markdown += `**Category:** ${pair.category}\n\n`;
      }
      if (pair.fileType) {
        markdown += `**Source:** ${pair.fileType}\n\n`;
      }
      markdown += `---\n\n`;
    });
    
    return markdown;
  };

  return (
    <div className="modal-overlay">
      <div className="modal qa-modal">
        <div className="modal-header">
          <h3>Q&A Data for {client?.name}</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
              <p>Loading Q&A data...</p>
            </div>
          ) : qaData === null ? (
            <div className="empty-state">
              <h4>No Q&A Data Found</h4>
              <p>This client doesn't have any Q&A pairs yet. Upload a Q&A file or run scraping automation to generate data.</p>
              <button className="btn btn-secondary" onClick={onClose}>
                Close
              </button>
            </div>
          ) : qaData.pairs && qaData.pairs.length > 0 ? (
            <>
              <div className="qa-summary">
                <p><strong>Total Q&A Pairs:</strong> {qaData.totalPairs}</p>
                <p><strong>Website:</strong> {qaData.client.website}</p>
              </div>
              
              <div className="qa-content">
                <MarkdownViewer content={generateMarkdownContent(qaData)} />
              </div>
              
              <div className="modal-actions">
                <button 
                  className="btn btn-primary" 
                  onClick={onDownload}
                  title="Download all Q&A data as markdown file"
                >
                  📥 Download Markdown
                </button>
                <button 
                  className="btn btn-danger-outline"
                  onClick={() => onDeleteQA(client)}
                  disabled={!qaData?.totalPairs || qaData?.totalPairs === 0}
                  title="Delete all Q&A data"
                >
                  🗑️ Delete Q&A
                </button>
                <button 
                  className="btn btn-danger-outline"
                  onClick={() => onDeleteChunks(client)}
                  disabled={!client?.totalPagesScrapped || client?.totalPagesScrapped === 0}
                  title="Delete scraped data"
                >
                  🗑️ Delete Chunks
                </button>
                <button className="btn btn-secondary" onClick={onClose}>
                  Close
                </button>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <h4>No Q&A Data Found</h4>
              <p>This client doesn't have any Q&A pairs yet. Upload a Q&A file or run scraping automation to generate data.</p>
              <button className="btn btn-secondary" onClick={onClose}>
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const MarkdownViewer = ({ content }) => {
  const formatMarkdownToHTML = (markdown) => {
    return markdown
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^---$/gm, '<hr>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(.*)$/gm, '<p>$1</p>')
      .replace(/<p><h/g, '<h')
      .replace(/<\/h([1-6])><\/p>/g, '</h$1>')
      .replace(/<p><hr><\/p>/g, '<hr>')
      .replace(/<p><\/p>/g, '');
  };

  return (
    <div className="markdown-viewer">
      <div 
        className="markdown-content"
        dangerouslySetInnerHTML={{ __html: formatMarkdownToHTML(content) }} 
      />
    </div>
  );
};

const DeleteConfirmModal = ({ client, onConfirm, onCancel }) => {
  if (!client) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content delete-modal">
        <div className="modal-header">
          <h3>🗑️ Delete Client</h3>
        </div>
        
        <div className="modal-body">
          <div className="delete-warning">
            <div className="warning-icon">⚠️</div>
            <div className="warning-content">
              <h4>Are you sure you want to delete this client?</h4>
              <p>This will permanently remove <strong>{client.name}</strong> and all associated data, including scraped content and Q&A pairs.</p>
            </div>
          </div>
          <div className="delete-consequences">
            <p className="warning-text"><strong>This action cannot be undone!</strong></p>
          </div>
        </div>
        
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm}>Yes, Delete Client</button>
        </div>
      </div>
    </div>
  );
};

export default Clients;
