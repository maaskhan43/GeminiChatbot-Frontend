const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

export const clientLogin = async (email, password, clientId) => {
  try {
    const response = await fetch(`${API_URL}/api/client/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }
    
    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const verifyClientToken = async (token) => {
  try {
    const response = await fetch(`${API_URL}/api/client/verify-token`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Token verification failed');
    }
    
    return data;
  } catch (error) {
    console.error('Token verification error:', error);
    throw error;
  }
};

export const getClientInfo = async (clientId, token) => {
  try {
    const response = await fetch(`${API_URL}/api/client/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch client info');
    }
    
    return data;
  } catch (error) {
    console.error('Fetch client info error:', error);
    throw error;
  }
};
