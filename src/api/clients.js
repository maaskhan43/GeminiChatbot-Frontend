import apiClient from './client';

export const clientsAPI = {
  // Get all clients
  getClients: async () => {
    try {
      const response = await apiClient.get('/api/admin/clients');
      return response.data;
    } catch (error) {
      throw {
        message: error.response?.data?.message || error.message || 'Failed to fetch clients',
        status: error.response?.status
      };
    }
  },

  // Get single client
  getClient: async (id) => {
    try {
      const response = await apiClient.get(`/api/admin/clients/${id}`);
      return response.data;
    } catch (error) {
      throw {
        message: error.response?.data?.message || error.message || 'Failed to fetch client',
        status: error.response?.status
      };
    }
  },

  // Create new client
  createClient: async (clientData) => {
    try {
      const response = await apiClient.post('/api/admin/clients', clientData);
      return response.data;
    } catch (error) {
      throw {
        message: error.response?.data?.message || error.message || 'Failed to create client',
        status: error.response?.status
      };
    }
  },

  // Update client
  updateClient: async (id, clientData) => {
    try {
      const response = await apiClient.put(`/api/admin/clients/${id}`, clientData);
      return response.data;
    } catch (error) {
      throw {
        message: error.response?.data?.message || error.message || 'Failed to update client',
        status: error.response?.status
      };
    }
  },

  // Delete client
  deleteClient: async (id) => {
    try {
      const response = await apiClient.delete(`/api/admin/clients/${id}`);
      return response.data;
    } catch (error) {
      throw {
        message: error.response?.data?.message || error.message || 'Failed to delete client',
        status: error.response?.status
      };
    }
  },

  // Start scraping job
  startScraping: async (id, urls = []) => {
    try {
      const response = await apiClient.post(`/api/admin/clients/${id}/scrape`, { urls });
      return response.data;
    } catch (error) {
      throw {
        message: error.response?.data?.message || error.message || 'Failed to start scraping',
        status: error.response?.status
      };
    }
  },

  // Get scraping status
  getScrapingStatus: async (jobId) => {
    try {
      const response = await apiClient.get(`/api/admin/clients/scraping/status/${jobId}`);
      return response.data;
    } catch (error) {
      throw {
        message: error.response?.data?.message || error.message || 'Failed to get scraping status',
        status: error.response?.status
      };
    }
  },

  // Get scraped data
  getScrapedData: async (id) => {
    try {
      const response = await apiClient.get(`/api/admin/clients/${id}/scraped-data`);
      return response.data;
    } catch (error) {
      throw {
        message: error.response?.data?.message || error.message || 'Failed to get scraped data',
        status: error.response?.status
      };
    }
  },

  // Export scraped data as CSV
  exportScrapedDataCSV: async (id) => {
    try {
      const response = await apiClient.get(`/api/admin/clients/${id}/export-csv`, {
        responseType: 'blob' // Important for file download
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Extract filename from response headers or create default
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'scraped_data.csv';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return { success: true, message: 'CSV export started' };
    } catch (error) {
      throw {
        message: error.response?.data?.message || error.message || 'Failed to export CSV',
        status: error.response?.status
      };
    }
  },

  // Upload Q&A pairs from file
  uploadQAPairs: async (id, file) => {
    try {
      const formData = new FormData();
      formData.append('qaFile', file);
      formData.append('clientId', id);
      
      console.log(`📤 Uploading Q&A file: ${file.name} (${file.type}) for client ${id}`);
      
      const response = await apiClient.post(`/api/admin/clients/${id}/upload-qa`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 60 second timeout for large files
      });
      
      console.log(`✅ Q&A upload successful:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`❌ Q&A upload failed:`, error);
      throw {
        message: error.response?.data?.message || error.message || 'Failed to upload Q&A file',
        status: error.response?.status
      };
    }
  },

  // Semantic search for chatbot
  semanticSearch: async (query, clientId, sessionId) => {
    try {
      const response = await apiClient.post('/api/admin/chat/semantic-search', {
        query,
        clientId,
        sessionId
      });
      return response.data;
    } catch (error) {
      throw {
        message: error.response?.data?.message || error.message || 'Failed to perform semantic search',
        status: error.response?.status
      };
    }
  },

  // Handle suggestion click with language context
  handleSuggestionClick: async (originalQuestion, userLanguage, clientId, sessionId) => {
    try {
      const response = await apiClient.post('/api/admin/chat/suggestion-click', {
        originalQuestion: originalQuestion,
        userLanguage: userLanguage,
        clientId: clientId,
        sessionId: sessionId
      });
      return response.data;
    } catch (error) {
      throw {
        message: error.response?.data?.message || error.message || 'Failed to handle suggestion click',
        status: error.response?.status
      };
    }
  },

  // Get Q&A pairs for a client
  getClientQAPairs: async (id) => {
    try {
      const response = await apiClient.get(`/api/admin/clients/${id}/qa-data`);
      return response.data;
    } catch (error) {
      throw {
        message: error.response?.data?.message || error.message || 'Failed to get Q&A pairs',
        status: error.response?.status
      };
    }
  },

  // Download Q&A data as markdown file
  downloadQAMarkdown: async (id, clientName) => {
    try {
      const response = await apiClient.get(`/api/admin/clients/${id}/qa-markdown`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Extract filename from response headers or create default
      const contentDisposition = response.headers['content-disposition'];
      let filename = `${clientName.replace(/[^a-zA-Z0-9]/g, '_')}_QA_Data.md`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return { success: true, message: 'Markdown file downloaded' };
    } catch (error) {
      throw {
        message: error.response?.data?.message || error.message || 'Failed to download Q&A markdown',
        status: error.response?.status
      };
    }
  },

  // Get client by ID for settings
  getClientById: async (id) => {
    try {
      const response = await apiClient.get(`/api/admin/clients/${id}`);
      return response.data;
    } catch (error) {
      throw {
        message: error.response?.data?.message || error.message || 'Failed to fetch client details',
        status: error.response?.status
      };
    }
  },

  // Get embed script for client
  getEmbedScript: async (id) => {
    try {
      const response = await apiClient.get(`/api/admin/clients/${id}/embed-script`);
      return response.data;
    } catch (error) {
      throw {
        message: error.response?.data?.message || error.message || 'Failed to get embed script',
        status: error.response?.status
      };
    }
  },

  // Get chat history for client
  getChatHistory: async (id, limit = 50) => {
    try {
      const response = await apiClient.get(`/api/admin/clients/${id}/chat-history?limit=${limit}`);
      return response.data;
    } catch (error) {
      throw {
        message: error.response?.data?.message || error.message || 'Failed to get chat history',
        status: error.response?.status
      };
    }
  }
};
