import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const ClientRoute = ({ children }) => {
  const navigate = useNavigate();
  const { clientId } = useParams();

  useEffect(() => {
    // Check if client is authenticated
    const token = localStorage.getItem('clientToken');
    if (!token) {
      // If not authenticated, redirect to client login with the clientId
      navigate(`/client/login?clientId=${clientId}`);
      return;
    }

    // TODO: Verify token with backend
    // For now, we'll just check if token exists
  }, [navigate, clientId]);

  // If authenticated, render the children
  return children;
};

export default ClientRoute;
