import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth.jsx';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Clients from './components/Clients';
import ClientSettings from './components/ClientSettings';
import ClientPanel from './pages/ClientPanel';
import ClientLogin from './pages/ClientLogin';
import ProtectedRoute from './components/ProtectedRoute';
import ClientRoute from './components/ClientRoute';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app">
          <Routes>
            {/* Admin routes */}
            <Route path="/login" element={<Login />} />
            
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/clients" 
              element={
                <ProtectedRoute>
                  <Clients />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/clients/:clientId/settings" 
              element={
                <ProtectedRoute>
                  <ClientSettings />
                </ProtectedRoute>
              } 
            />
            
            {/* Client routes */}
            <Route path="/client/login" element={<ClientLogin />} />
            
            <Route 
              path="/client/:clientId" 
              element={
                <ClientRoute>
                  <ClientPanel />
                </ClientRoute>
              } 
            />
            
            {/* Default redirects */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
