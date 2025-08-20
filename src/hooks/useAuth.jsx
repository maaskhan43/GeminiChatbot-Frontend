import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../api/auth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sessionCheckInterval, setSessionCheckInterval] = useState(null);

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('🔄 Initializing auth state...');
        const token = authAPI.getStoredToken();
        
        console.log('📋 Stored token exists:', !!token);
        
        if (token) {
          // Check token expiry but be more lenient
          let isExpired = false;
          try {
            isExpired = authAPI.isTokenExpired();
            console.log('⏰ Token expired:', isExpired);
          } catch (error) {
            console.log('⚠️ Could not check token expiry, assuming valid:', error.message);
            // If we can't check expiry, assume token is still valid
            isExpired = false;
          }
          
          if (!isExpired) {
            console.log('✅ Valid stored auth found, setting admin');
            // Set admin immediately for better UX
            const storedAdmin = authAPI.getStoredAdmin();
            setAdmin(storedAdmin);
            setLoading(false);
          } else {
            console.log('⏰ Token expired, clearing auth');
            // Only clear auth if token is definitely expired
            await authAPI.logout();
            setAdmin(null);
            setLoading(false);
          }
        } else {
          // No stored auth data
          console.log('🚫 No token found');
          setAdmin(null);
          setLoading(false);
        }
      } catch (error) {
        console.error('❌ Auth initialization error:', error);
        // Don't clear auth on initialization errors - might be temporary
        console.log('⚠️ Keeping existing auth state due to initialization error');
        const storedAdmin = authAPI.getStoredAdmin();
        if (storedAdmin) {
          setAdmin(storedAdmin);
        } else {
          setAdmin(null);
        }
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (credentials) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await authAPI.login(credentials);
      
      if (result.success) {
        setAdmin(result.admin);
        return { success: true };
      } else {
        setError(result.message || 'Login failed');
        return { success: false, message: result.message };
      }
    } catch (error) {
      const errorMessage = error.message || 'Login failed';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await authAPI.logout();
      setAdmin(null);
      setError(null);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value = {
    admin,
    loading,
    error,
    login,
    logout,
    clearError,
    isAuthenticated: !!admin
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
