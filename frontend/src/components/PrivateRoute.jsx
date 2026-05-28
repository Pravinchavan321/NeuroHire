import { Navigate, useLocation } from 'react-router-dom';

export default function PrivateRoute({ children, requiredRole }) {
  const location = useLocation();
  const token = localStorage.getItem('token');
  const savedUser = localStorage.getItem('user');
  const user = savedUser ? JSON.parse(savedUser) : null;

  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
